import { useRef, useEffect } from 'react';

interface ChromaKeyVideoProps {
  src: string;
  className?: string;
}

export const ChromaKeyVideo = ({ src, className = '' }: ChromaKeyVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const processFrame = () => {
      if (video.paused || video.ended) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
      }

      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Chroma key: detect green screen pixels
        // Green is dominant and significantly higher than red and blue
        if (g > 80 && g > r * 1.2 && g > b * 1.2) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(frame, 0, 0);
      rafRef.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      rafRef.current = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);
    // If already playing
    if (!video.paused) {
      rafRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />
      <canvas ref={canvasRef} className="h-full w-auto" />
    </div>
  );
};
