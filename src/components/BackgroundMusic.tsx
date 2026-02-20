import { useRef, useEffect, useState } from 'react';

interface BackgroundMusicProps {
  src: string;
  autoPlay?: boolean;
  defaultVolume?: number;
  muted?: boolean;
}

export const BackgroundMusic = ({ 
  src, 
  autoPlay = true, 
  defaultVolume = 0.3,
  muted = false,
}: BackgroundMusicProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = defaultVolume;
    audio.loop = true;

    if (autoPlay && hasInteracted && !muted) {
      audio.play().catch(() => {});
    } else if (!autoPlay || muted) {
      audio.pause();
    }
  }, [autoPlay, defaultVolume, hasInteracted, muted]);

  // Listen for first user interaction on the page
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current && !muted) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [muted]);

  return <audio ref={audioRef} src={src} preload="auto" />;
};
