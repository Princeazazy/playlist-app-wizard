import { motion } from 'framer-motion';
import { Home, Search, Heart, User, Tv } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'home' | 'search' | 'live' | 'favorites' | 'profile';
  onTabChange: (tab: 'home' | 'search' | 'live' | 'favorites' | 'profile') => void;
}

const navItems = [
  { id: 'home' as const, icon: Home, label: 'Home' },
  { id: 'search' as const, icon: Search, label: 'Search' },
  { id: 'live' as const, icon: Tv, label: 'Live TV' },
  { id: 'favorites' as const, icon: Heart, label: 'Favorites' },
  { id: 'profile' as const, icon: User, label: 'Profile' },
];

export const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-4 left-4 right-4 z-50"
    >
      <div className="bg-card/90 backdrop-blur-xl rounded-full border border-border/30 shadow-2xl shadow-black/30 px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute inset-0 bg-primary/20 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[10px] font-medium text-primary relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
