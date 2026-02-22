import { memo, useMemo } from 'react';

const StarField = memo(() => {
  const stars = useMemo(() => {
    const result: { x: number; y: number; size: number; delay: number; duration: number; color: string }[] = [];
    const colors = [
      'rgba(255,255,255,',
      'rgba(200,220,255,',
      'rgba(255,200,255,',
      'rgba(255,230,200,',
      'rgba(180,200,255,',
    ];
    for (let i = 0; i < 180; i++) {
      result.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return result;
  }, []);

  const shootingStars = useMemo(() => {
    const result: { startX: number; startY: number; angle: number; delay: number; duration: number; length: number; size: number }[] = [];
    for (let i = 0; i < 8; i++) {
      result.push({
        startX: Math.random() * 100,
        startY: Math.random() * 60,
        angle: Math.random() * 40 + 20,
        delay: Math.random() * 20 + i * 3,
        duration: Math.random() * 1.5 + 2.5,
        length: Math.random() * 100 + 80,
        size: Math.random() * 1.5 + 1,
      });
    }
    return result;
  }, []);

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-[twinkle_ease-in-out_infinite]"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: `${star.color}0.9)`,
            boxShadow: `0 0 ${star.size * 2}px ${star.size}px ${star.color}0.4), 0 0 ${star.size * 4}px ${star.size * 2}px ${star.color}0.15)`,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            animationName: 'star-glow',
          }}
        />
      ))}
      {shootingStars.map((s, i) => (
        <div
          key={`shooting-${i}`}
          className="absolute"
          style={{
            left: `${s.startX}%`,
            top: `${s.startY}%`,
            width: `${s.length}px`,
            height: `${s.size}px`,
            background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 10%, rgba(200,220,255,0.8) 60%, rgba(255,255,255,1) 100%)`,
            borderRadius: '50%',
            transform: `rotate(${s.angle}deg)`,
            opacity: 0,
            filter: `blur(${s.size > 2 ? 0.5 : 0}px)`,
            boxShadow: `0 0 ${s.size * 4}px ${s.size}px rgba(200,220,255,0.5), 0 0 ${s.size * 8}px ${s.size * 2}px rgba(180,200,255,0.2)`,
            animation: `shooting-star ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        >
          {/* Bright head */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${s.size * 2.5}px`,
              height: `${s.size * 2.5}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,220,255,0.8) 40%, transparent 70%)',
              boxShadow: `0 0 ${s.size * 6}px ${s.size * 2}px rgba(200,220,255,0.6)`,
            }}
          />
        </div>
      ))}
    </div>
  );
});

StarField.displayName = 'StarField';

export default StarField;
