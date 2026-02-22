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
    const result: { startX: number; startY: number; angle: number; delay: number; duration: number; length: number }[] = [];
    for (let i = 0; i < 5; i++) {
      result.push({
        startX: Math.random() * 80 + 10,
        startY: Math.random() * 40,
        angle: Math.random() * 30 + 15, // 15-45 degrees
        delay: Math.random() * 12 + i * 4,
        duration: Math.random() * 0.8 + 0.6,
        length: Math.random() * 80 + 60,
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
            height: '2px',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(200,220,255,0.6), transparent)',
            borderRadius: '2px',
            transform: `rotate(${s.angle}deg)`,
            opacity: 0,
            boxShadow: '0 0 6px 2px rgba(200,220,255,0.3)',
            animation: `shooting-star ${s.duration}s ease-in ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

StarField.displayName = 'StarField';

export default StarField;
