import { useRef, useEffect } from 'react';
import introVideo from '@/assets/arabia-intro.mp4';

interface ArabiaIntroProps {
  onComplete: () => void;
}

export const ArabiaIntro = ({ onComplete }: ArabiaIntroProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hardTimeout = window.setTimeout(onComplete, 15000);

    const handleEnded = () => onComplete();
    const handleError = () => onComplete();

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Try unmuted first, fall back to muted — never show a prompt
    const tryPlay = async () => {
      try {
        video.muted = false;
        await video.play();
      } catch {
        try {
          video.muted = true;
          await video.play();
        } catch {
          onComplete();
        }
      }
    };

    tryPlay();

    return () => {
      clearTimeout(hardTimeout);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        playsInline
        preload="auto"
        poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
      >
        <source src={introVideo} type="video/mp4" />
      </video>
    </div>
  );
};
