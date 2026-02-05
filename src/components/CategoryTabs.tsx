import { motion } from 'framer-motion';

interface CategoryTab {
  id: string;
  label: string;
}

interface CategoryTabsProps {
  tabs: CategoryTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const CategoryTabs = ({ tabs, activeTab, onTabChange }: CategoryTabsProps) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar px-4 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="relative px-4 py-2 rounded-full whitespace-nowrap transition-colors"
        >
          <span className={`text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {tab.label}
          </span>
          
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-0 bg-card rounded-full -z-10"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};
