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

  // Fetch content — single full fetch (no bootstrap/background split)
  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchContent = async () => {
      const hasCached = channels.length > 0;
      if (!hasCached) setLoading(true);

      try {
        console.log(`[Provider] Fetching full content for "${account.name}"`);

        const result = await fetchProviderContent(account.config, account.id, {
          maxChannels: 150000,
          maxBytesMB: 80,
          maxReturnPerType: 50000,
        });

        if (cancelled) return;

        if (result.length === 0 && !hasCached) {
          setError('No channels found. Check your credentials.');
          setLoading(false);
          return;
        }

        // Assign stable IDs
        const withIds = result.map((ch, i) => ({ ...ch, id: `${account.id}-ch-${i}` }));

        console.log(`[Provider] Loaded ${withIds.length} channels`, {
          live: withIds.filter(c => c.type === 'live').length,
          movies: withIds.filter(c => c.type === 'movies').length,
          series: withIds.filter(c => c.type === 'series').length,
          sports: withIds.filter(c => c.type === 'sports').length,
        });

        setChannels(withIds);
        setError(null);
        setLoading(false);

        // Cache
        setCachedChannels(withIds, cacheKey).catch(e => console.warn('Cache failed:', e));
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
  }, [account?.id, account?.config, refreshKey, cacheKey]);

  const refresh = useCallback(async () => {
    console.log('[Provider] Refreshing...');
    try {
      const { clearChannelCache } = await import('@/lib/channelCache');
      await clearChannelCache();
    } catch {}
    setChannels([]);
    setLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  return { channels, loading, error, refresh };
}
