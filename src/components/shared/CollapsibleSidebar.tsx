import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CollapsibleSidebarProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  onBack?: () => void;
  title?: string;
  defaultCollapsed?: boolean;
}

export const CollapsibleSidebar = ({
  children,
  header,
  footer,
  isOpen: controlledIsOpen,
  onToggle,
  isMobile = false,
  onBack,
  title,
  defaultCollapsed = false,
}: CollapsibleSidebarProps) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(defaultCollapsed);
  
  // For mobile, use controlled open/close
  // For desktop, use internal collapsed state
  const isCollapsed = isMobile ? false : internalIsCollapsed;
  
  const toggleCollapse = () => {
    if (isMobile && onToggle) {
      onToggle();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  // Mobile overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {controlledIsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-background border-r border-border/30 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/20">
                <button
                  onClick={onToggle}
                  className="w-10 h-10 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
                {header}
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto mi-scrollbar">
                {children}
              </div>
              
              {/* Footer */}
              {footer && (
                <div className="p-3 border-t border-border/20">
                  {footer}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop collapsible
  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 224 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex-shrink-0 flex flex-col border-r border-border/30 bg-background relative"
    >
      {/* Collapse toggle */}
      <motion.button
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-md"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </motion.button>

      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        <AnimatePresence>
          {!isCollapsed && title && (
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-semibold text-foreground whitespace-nowrap overflow-hidden"
            >
              {title}
            </motion.h1>
          )}
        </AnimatePresence>
        {header}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 mi-scrollbar">
        {children}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="p-3">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

// Sidebar item for consistent styling
interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
  logo?: string;
}

export const SidebarItem = ({
  icon,
  label,
  count,
  isActive,
  isCollapsed,
  onClick,
  logo,
}: SidebarItemProps) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02, x: 2 }}
    whileTap={{ scale: 0.98 }}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
      isActive
        ? 'bg-card text-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
    }`}
  >
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
      {logo ? (
        <img src={logo} alt={label} className="w-full h-full object-cover" />
      ) : (
        icon
      )}
    </div>
    
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="flex-1 text-left min-w-0"
        >
          <p className={`text-sm truncate ${isActive ? 'font-semibold' : ''}`}>
            {label}
          </p>
          {isActive && count !== undefined && (
            <p className="text-xs text-muted-foreground">{count} Channels</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.button>
);
