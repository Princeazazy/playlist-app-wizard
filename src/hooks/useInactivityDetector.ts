import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 4 * 60 * 1000; // 4 minutes

export const useInactivityDetector = (isPlaying: boolean) => {
  const [isInactive, setIsInactive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInactiveRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      setIsInactive(false);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isInactiveRef.current = true;
      setIsInactive(true);
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      isInactiveRef.current = false;
      setIsInactive(false);
      return;
    }

    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [isPlaying, resetTimer]);

  const dismiss = useCallback(() => {
    isInactiveRef.current = false;
    setIsInactive(false);
    resetTimer();
  }, [resetTimer]);

  return { isInactive, dismiss };
};
