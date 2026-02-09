import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedLogo, setCachedLogos, isPending, markPending, clearPending } from '@/lib/logoCache';

// Global queue to batch logo requests
let logoQueue: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<(url: string | null) => void>>();

const flushQueue = async () => {
  if (logoQueue.length === 0) return;

  // Take up to 5 names at a time
  const batch = logoQueue.splice(0, 5);
  
  try {
    const { data, error } = await supabase.functions.invoke('find-channel-logo', {
      body: { channelNames: batch },
    });

    if (error) {
      console.error('Logo fetch error:', error);
      batch.forEach(name => {
        clearPending(name);
        listeners.get(name)?.forEach(cb => cb(null));
      });
      return;
    }

    const logos: Record<string, string | null> = data?.logos || {};
    setCachedLogos(logos);

    // Notify listeners
    for (const name of batch) {
      const url = logos[name] || null;
      clearPending(name);
      listeners.get(name)?.forEach(cb => cb(url));
      listeners.delete(name);
    }
  } catch (e) {
    console.error('Logo fetch failed:', e);
    batch.forEach(name => {
      clearPending(name);
      listeners.get(name)?.forEach(cb => cb(null));
    });
  }

  // If there are more in the queue, flush again after a delay
  if (logoQueue.length > 0) {
    flushTimer = setTimeout(flushQueue, 2000);
  }
};

const enqueueLogoFetch = (channelName: string, callback: (url: string | null) => void) => {
  if (isPending(channelName)) {
    // Already in queue, just add listener
    if (!listeners.has(channelName)) listeners.set(channelName, new Set());
    listeners.get(channelName)!.add(callback);
    return;
  }

  markPending(channelName);
  if (!listeners.has(channelName)) listeners.set(channelName, new Set());
  listeners.get(channelName)!.add(callback);
  logoQueue.push(channelName);

  // Debounce flush
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushQueue, 1000);
};

export const useChannelLogo = (channelName: string, existingLogo?: string) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(existingLogo);
  const requestedRef = useRef(false);

  useEffect(() => {
    // If channel already has a logo, use it
    if (existingLogo) {
      setLogoUrl(existingLogo);
      return;
    }

    if (!channelName || requestedRef.current) return;

    // Check cache first
    const cached = getCachedLogo(channelName);
    if (cached !== undefined) {
      // cached is either a URL string or null (meaning "not found")
      if (cached) setLogoUrl(cached);
      return;
    }

    // Not cached - enqueue fetch
    requestedRef.current = true;
    enqueueLogoFetch(channelName, (url) => {
      if (url) setLogoUrl(url);
    });
  }, [channelName, existingLogo]);

  return logoUrl;
};
