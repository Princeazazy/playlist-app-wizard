import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedLogo, setCachedLogos } from '@/lib/logoCache';

// Bulk logo resolver - processes all channels without logos at the list level
export const useBulkChannelLogos = (channels: { name: string; logo?: string }[]) => {
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const processedRef = useRef(new Set<string>());
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Find channels that need logos
    const needLogos: string[] = [];
    const initialMap: Record<string, string> = {};

    for (const ch of channels) {
      if (ch.logo) continue;
      if (processedRef.current.has(ch.name)) continue;

      const cached = getCachedLogo(ch.name);
      if (cached !== undefined) {
        if (cached) initialMap[ch.name] = cached;
        processedRef.current.add(ch.name);
        continue;
      }

      needLogos.push(ch.name);
    }

    if (Object.keys(initialMap).length > 0) {
      setLogoMap(prev => ({ ...prev, ...initialMap }));
    }

    const uniqueNames = [...new Set(needLogos)];
    if (uniqueNames.length === 0 || isProcessingRef.current) return;

    // Defer logo fetching so the list renders instantly first
    const startFetching = () => {
      isProcessingRef.current = true;
      processBatches(uniqueNames);
    };

    // Use requestIdleCallback if available, otherwise setTimeout 1s
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(startFetching, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const id = setTimeout(startFetching, 1000);
      return () => clearTimeout(id);
    }
  }, [channels]);

  const processBatches = async (uniqueNames: string[]) => {
    // Mark as processed to prevent re-requests
    uniqueNames.forEach(name => processedRef.current.add(name));

    const processBatchWork = async () => {
      for (let i = 0; i < uniqueNames.length; i += 5) {
        const batch = uniqueNames.slice(i, i + 5);

        try {
          const { data, error } = await supabase.functions.invoke('find-channel-logo', {
            body: { channelNames: batch },
          });

          if (!error && data?.logos) {
            const logos: Record<string, string | null> = data.logos;
            setCachedLogos(logos);

            const validLogos: Record<string, string> = {};
            for (const [name, url] of Object.entries(logos)) {
              if (url) validLogos[name] = url;
            }

            if (Object.keys(validLogos).length > 0) {
              setLogoMap(prev => ({ ...prev, ...validLogos }));
            }
          }
        } catch (e) {
          console.error('Batch logo fetch error:', e);
        }

        // Small delay between batches to avoid overwhelming the edge function
        if (i + 5 < uniqueNames.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      isProcessingRef.current = false;
    };

    processBatchWork();
  };

  // Returns the resolved logo for a channel
  const getLogoForChannel = useCallback((channelName: string, existingLogo?: string): string | undefined => {
    return existingLogo || logoMap[channelName];
  }, [logoMap]);

  return { logoMap, getLogoForChannel };
};
