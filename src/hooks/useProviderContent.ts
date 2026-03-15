import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ProviderAccount,
  NormalizedChannel,
} from '@/lib/providers/types';
import {
  getActiveAccount,
  setActiveAccountId,
  updateProviderAccount,
} from '@/lib/providers/storage';
import { fetchProviderContent } from '@/lib/providers/providerService';
import { getCachedChannels, setCachedChannels, clearLegacyCache } from '@/lib/channelCache';

clearLegacyCache();

/**
 * useProviderContent — fetches and caches content for the active provider account.
 * Replaces the old useIPTV hook for the multi-provider architecture.
 */
export function useProviderContent(account: ProviderAccount | null) {
  const [channels, setChannels] = useState<NormalizedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cacheLoaded = useRef(false);
  const prevAccountId = useRef<string | null>(null);

  // Cache key based on account
  const cacheKey = account ? `provider-${account.id}` : '';

  // Reset when account changes
  useEffect(() => {
    if (account?.id !== prevAccountId.current) {
      prevAccountId.current = account?.id || null;
      cacheLoaded.current = false;
      setChannels([]);
      setError(null);
      setLoading(true);
    }
  }, [account?.id]);

  // Load from cache
  useEffect(() => {
    if (!account || cacheLoaded.current) return;
    const load = async () => {
      const cached = await getCachedChannels(cacheKey);
      if (cached && cached.length > 0 && channels.length === 0) {
        console.log(`[Provider] Loaded ${cached.length} channels from cache for ${account.name}`);
        setChannels(cached as NormalizedChannel[]);
        setLoading(false);
      }
      cacheLoaded.current = true;
    };
    load();
  }, [account, cacheKey, channels.length]);

  // Fetch content — cache-first bootstrap + background full sync
  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchContent = async () => {
      const hasCached = channels.length > 0;
      const shouldBootstrap = !hasCached;
      if (!hasCached) setLoading(true);

      try {
        const firstPassOptions = shouldBootstrap
          ? { maxChannels: 90000, maxBytesMB: 60, maxReturnPerType: 12000 }
          : { maxChannels: 250000, maxBytesMB: 60, maxReturnPerType: 100000 };

        console.log(`[Provider] Fetching content for "${account.name}" [${shouldBootstrap ? 'bootstrap' : 'full'}]`);

        const firstPass = await fetchProviderContent(account.config, account.id, firstPassOptions);

        if (cancelled) return;

        if (firstPass.length === 0 && !hasCached) {
          setError('No channels found. Check your credentials.');
          setLoading(false);
          return;
        }

        const firstWithIds = firstPass.map((ch, i) => ({ ...ch, id: `${account.id}-ch-${i}` }));

        setChannels(firstWithIds);
        setError(null);
        setLoading(false);
        setCachedChannels(firstWithIds, cacheKey).catch(e => console.warn('Cache failed:', e));

        console.log(`[Provider] Loaded ${firstWithIds.length} channels`, {
          live: firstWithIds.filter(c => c.type === 'live').length,
          movies: firstWithIds.filter(c => c.type === 'movies').length,
          series: firstWithIds.filter(c => c.type === 'series').length,
          sports: firstWithIds.filter(c => c.type === 'sports').length,
        });

        // If we bootstrapped, fetch full catalog in background
        if (shouldBootstrap) {
          try {
            const fullResult = await fetchProviderContent(account.config, account.id, {
              maxChannels: 250000,
              maxBytesMB: 60,
              maxReturnPerType: 100000,
            });

            if (cancelled || fullResult.length === 0) return;

            if (fullResult.length > firstWithIds.length) {
              const fullWithIds = fullResult.map((ch, i) => ({ ...ch, id: `${account.id}-ch-${i}` }));
              setChannels(fullWithIds);
              setCachedChannels(fullWithIds, cacheKey).catch(() => {});
              console.log(`[Provider] Full sync completed: ${fullWithIds.length} channels`);
            }
          } catch (e) {
            console.warn('[Provider] Background full sync failed:', e);
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Provider] Fetch failed:', err);
        if (channels.length === 0) {
          setError(err.message || 'Failed to load content');
        }
        setLoading(false);
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [account?.id, refreshKey, cacheKey]);

  const refresh = useCallback(async () => {
    console.log('[Provider] Refreshing...');
    try {
      const { clearChannelCache } = await import('@/lib/channelCache');
      await clearChannelCache();
    } catch {}
    setError(null);
    setRefreshKey(k => k + 1);
  }, []);

  return { channels, loading, error, refresh };
}
