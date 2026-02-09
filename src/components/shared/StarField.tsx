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
    for (let i = 0; i < 100; i++) {
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
    </div>
  );
});

StarField.displayName = 'StarField';

export default StarField;
