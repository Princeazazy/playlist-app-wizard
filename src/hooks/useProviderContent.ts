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
 * Single-pass full fetch (no bootstrap/full-sync split) for completeness.
 * Cache-first for instant startup, then background refresh.
 */
export function useProviderContent(account: ProviderAccount | null) {
  const [channels, setChannels] = useState<NormalizedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cacheLoaded = useRef(false);
  const prevAccountId = useRef<string | null>(null);
  const fetchInProgress = useRef(false);

  // Cache key based on account
  const cacheKey = account ? `provider-${account.id}` : '';

  // Reset when account changes
  useEffect(() => {
    if (account?.id !== prevAccountId.current) {
      prevAccountId.current = account?.id || null;
      cacheLoaded.current = false;
      fetchInProgress.current = false;
      setChannels([]);
      setError(null);
      setLoading(true);
    }
  }, [account?.id]);

  // Load from cache immediately for instant startup
  useEffect(() => {
    if (!account || cacheLoaded.current) return;
    const load = async () => {
      const cached = await getCachedChannels(cacheKey);
      if (cached && cached.length > 0 && channels.length === 0) {
        console.log(`[Provider] Cache hit: ${cached.length} channels for "${account.name}"`);
        setChannels(cached as NormalizedChannel[]);
        setLoading(false);
      }
      cacheLoaded.current = true;
    };
    load();
  }, [account, cacheKey, channels.length]);

  // Fetch content — SINGLE full fetch, no bootstrap split
  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current && refreshKey === 0) return;

    let cancelled = false;
    fetchInProgress.current = true;

    const fetchContent = async () => {
      const hasCached = channels.length > 0;
      if (!hasCached) setLoading(true);

      try {
        // Single full fetch — no bootstrap/full-sync split
        // This ensures ALL content loads completely every time
        const fetchOptions = {
          maxChannels: 250000,
          maxBytesMB: 80,
          maxReturnPerType: 100000,
        };

        console.log(`[Provider] Fetching FULL catalog for "${account.name}"...`);
        const startTime = Date.now();

        const result = await fetchProviderContent(account.config, account.id, fetchOptions);

        if (cancelled) return;

        if (result.length === 0 && !hasCached) {
          setError('No channels found. The provider may be blocking this connection. Try from the native APK or check credentials.');
          setLoading(false);
          fetchInProgress.current = false;
          return;
        }

        const withIds = result.map((ch, i) => ({ ...ch, id: `${account.id}-ch-${i}` }));
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        const counts = {
          live: withIds.filter(c => c.type === 'live').length,
          movies: withIds.filter(c => c.type === 'movies').length,
          series: withIds.filter(c => c.type === 'series').length,
          sports: withIds.filter(c => c.type === 'sports').length,
        };

        console.log(`[Provider] ✅ Loaded ${withIds.length} channels in ${elapsed}s`, counts);

        setChannels(withIds);
        setError(null);
        setLoading(false);
        fetchInProgress.current = false;

        // Cache in background
        setCachedChannels(withIds, cacheKey).catch(e => console.warn('Cache write failed:', e));
      } catch (err: any) {
        if (cancelled) return;
        console.error('[Provider] Fetch failed:', err);
        fetchInProgress.current = false;

        if (channels.length === 0) {
          setError(err.message || 'Failed to load content');
        } else {
          console.warn('[Provider] Fetch failed but keeping cached data');
        }
        setLoading(false);
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [account?.id, refreshKey, cacheKey]);

  const refresh = useCallback(async () => {
    console.log('[Provider] Manual refresh triggered');
    setLoading(true);
    setError(null);
    // Keep existing channels visible while refreshing (don't clear to [])
    cacheLoaded.current = false;
    fetchInProgress.current = false;

    try {
      const { clearChannelCache } = await import('@/lib/channelCache');
      await clearChannelCache();
    } catch {}

    setRefreshKey(k => k + 1);
  }, []);

  return { channels, loading, error, refresh };
}
