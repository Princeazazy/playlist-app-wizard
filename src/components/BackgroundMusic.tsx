import { useRef, useEffect, useState } from 'react';

interface BackgroundMusicProps {
  src: string;
  autoPlay?: boolean;
  defaultVolume?: number;
}

export const BackgroundMusic = ({ 
  src, 
  autoPlay = true, 
  defaultVolume = 0.3 
}: BackgroundMusicProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = defaultVolume;
    audio.loop = true;

    if (autoPlay && hasInteracted) {
      audio.play().catch(() => {});
    } else if (!autoPlay) {
      audio.pause();
    }
  }, [autoPlay, defaultVolume, hasInteracted]);

  // Listen for first user interaction on the page
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      if (audioRef.current) {
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
  }, []);

  return <audio ref={audioRef} src={src} preload="auto" />;
};
