import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Loader2 } from 'lucide-react';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';
import { Channel } from '@/hooks/useIPTV';
import { CardCarousel3D } from './CardCarousel3D';
import { CategoryTabs } from './CategoryTabs';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileBrowseScreenProps {
  channels: Channel[];
  onTMDBSelect: (item: TMDBItem) => void;
  onChannelSelect: (channel: Channel) => void;
  onNavigate: (section: 'live' | 'movies' | 'series' | 'sports' | 'settings') => void;
  onSearchClick: () => void;
}

const CATEGORY_TABS = [
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New' },
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'tv', label: 'TV Shows' },
];

export const MobileBrowseScreen = ({
  channels,
  onTMDBSelect,
  onChannelSelect,
  onNavigate,
  onSearchClick,
}: MobileBrowseScreenProps) => {
  const { getTrending, getMovies, getTVShows, loading } = useTMDB();
  const [activeTab, setActiveTab] = useState('trending');
  const [bottomNavTab, setBottomNavTab] = useState<'home' | 'search' | 'live' | 'favorites' | 'profile'>('home');
  const [carouselItems, setCarouselItems] = useState<TMDBItem[]>([]);
  const [forYouItems, setForYouItems] = useState<TMDBItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load content based on active tab
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        let items: TMDBItem[] = [];
        
        switch (activeTab) {
          case 'trending':
          case 'new':
            items = await getTrending();
            break;
          case 'movies':
            const moviesData = await getMovies('popular');
            items = moviesData.results;
            break;
          case 'series':
          case 'tv':
            const tvData = await getTVShows('popular');
            items = tvData.results;
            break;
        }
        
        setCarouselItems(items.slice(0, 10));
        
        // Get "For you" recommendations
        const forYou = await getTrending();
        setForYouItems(forYou.slice(0, 6));
      } catch (error) {
        console.error('Failed to load content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [activeTab, getTrending, getMovies, getTVShows]);

  // Handle bottom nav actions
  const handleBottomNavChange = (tab: 'home' | 'search' | 'live' | 'favorites' | 'profile') => {
    setBottomNavTab(tab);
    switch (tab) {
      case 'search':
        onSearchClick();
        break;
      case 'live':
        onNavigate('live');
        break;
      case 'profile':
        onNavigate('settings');
        break;
    }
  };

  // Get playlist content for "For you" section
  const playlistForYou = useMemo(() => {
    return channels
      .filter(ch => ch.type === 'movies' || ch.type === 'series')
      .slice(0, 6);
  }, [channels]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Category Tabs */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl pt-4">
        <CategoryTabs
          tabs={CATEGORY_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* 3D Card Carousel */}
      <div className="mt-6 px-4">
        <CardCarousel3D
          items={carouselItems}
          onSelect={onTMDBSelect}
          loading={isLoading}
        />
      </div>

      {/* For You Section */}
      <div className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">For you</h2>
          <button className="text-sm text-muted-foreground">See all</button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {forYouItems.map((item) => (
              <motion.button
                key={`${item.id}-${item.mediaType}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTMDBSelect(item)}
                className="aspect-[2/3] rounded-2xl overflow-hidden bg-card relative group"
              >
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* From Your Library */}
      {playlistForYou.length > 0 && (
        <div className="mt-8 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">From Your Library</h2>
            <button 
              onClick={() => onNavigate('movies')}
              className="text-sm text-muted-foreground"
            >
              See all
            </button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {playlistForYou.map((channel) => (
              <motion.button
                key={channel.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onChannelSelect(channel)}
                className="flex-shrink-0 w-28 aspect-[2/3] rounded-2xl overflow-hidden bg-card relative group"
              >
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <MobileBottomNav
        activeTab={bottomNavTab}
        onTabChange={handleBottomNavChange}
      />
    </div>
  );
};
