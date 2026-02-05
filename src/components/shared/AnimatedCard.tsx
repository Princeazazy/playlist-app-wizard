import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'large' | 'normal' | 'small';
  delay?: number;
  bgImage?: string;
  glowColor?: 'primary' | 'accent' | 'emerald';
}

export const AnimatedCard = ({
  children,
  onClick,
  className = '',
  size = 'normal',
  delay = 0,
  bgImage,
  glowColor = 'primary',
}: AnimatedCardProps) => {
  const sizeClasses = {
    large: 'col-span-1 row-span-2',
    normal: 'col-span-1 row-span-1',
    small: 'col-span-1 row-span-1',
  };

  const glowColors = {
    primary: 'from-primary/30 via-primary/10 to-transparent shadow-primary/20',
    accent: 'from-accent/30 via-accent/10 to-transparent shadow-accent/20',
    emerald: 'from-emerald-500/30 via-emerald-500/10 to-transparent shadow-emerald-500/20',
  };

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.08, 
        duration: 0.4,
        type: 'spring',
        stiffness: 100,
      }}
      whileHover={{ 
        scale: 1.03, 
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden transition-all duration-300 group ${className}`}
      style={{
        background: bgImage 
          ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(${bgImage}) center/cover`
          : 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
      }}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${glowColors[glowColor]} blur-xl`} />
      </div>
      
      {/* Inner border */}
      <div className="absolute inset-[1px] rounded-2xl bg-card/95 backdrop-blur-sm" />
      
      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-700"
      />
      
      {/* Top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col p-5 text-left z-10">
        {children}
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-2 right-2 w-2 h-8 rounded-full bg-primary/30" />
        <div className="absolute top-2 right-2 w-8 h-2 rounded-full bg-primary/30" />
      </div>
    </motion.button>
  );
};
