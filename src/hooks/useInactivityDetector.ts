import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute

/**
 * Hook to detect user inactivity and trigger screensaver.
 * Resets on mouse, keyboard, touch, or scroll events.
 * Does NOT activate when content is actively playing.
 */
export const useInactivityDetector = (isPlaying: boolean) => {
  const [isInactive, setIsInactive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (isInactive) setIsInactive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsInactive(true);
    }, INACTIVITY_TIMEOUT);
  }, [isInactive]);

  // Don't run screensaver when playing
  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsInactive(false);
      return;
    }

    // Start timer
    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [isPlaying, resetTimer]);

  const dismiss = useCallback(() => {
    setIsInactive(false);
    resetTimer();
  }, [resetTimer]);

  return { isInactive, dismiss };
};
