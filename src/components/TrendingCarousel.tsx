import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { InfiniteMarquee } from '@/components/shared/InfiniteMarquee';
import { useTMDB, TMDBItem } from '@/hooks/useTMDB';
import { Channel } from '@/hooks/useIPTV';
import { TrendingUp } from 'lucide-react';

interface TrendingCarouselProps {
  onSelectItem?: (item: TMDBItem) => void;
  channels?: Channel[];
  onChannelSelect?: (channel: Channel) => void;
}

const PosterCard = ({ 
  item, 
  onClick 
}: { 
  item: TMDBItem; 
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.08, y: -4 }}
    whileTap={{ scale: 0.95 }}
    className="relative w-[180px] h-[100px] md:w-[260px] md:h-[146px] rounded-xl overflow-hidden border border-border/20 group flex-shrink-0"
    style={{
      boxShadow: '0 4px 20px hsl(0 0% 0% / 0.4)',
    }}
  >
    {item.backdrop ? (
      <img
        src={item.backdrop}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
    ) : item.poster ? (
      <img
        src={item.poster}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
    ) : (
      <div className="absolute inset-0 bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-xs">{item.title}</span>
      </div>
    )}
    {/* Gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    {/* Title on hover */}
    <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
      <p className="text-white text-xs font-medium truncate">{item.title}</p>
      {item.rating && (
        <p className="text-primary text-[10px]">⭐ {item.rating.toFixed(1)}</p>
      )}
    </div>
    {/* Hover glow border */}
    <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/40 transition-colors duration-300 pointer-events-none" />
  </motion.button>
);

const ChannelCard = ({ 
  channel, 
  onClick 
}: { 
  channel: Channel; 
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.08, y: -4 }}
    whileTap={{ scale: 0.95 }}
    className="relative w-[180px] h-[100px] md:w-[260px] md:h-[146px] rounded-xl overflow-hidden border border-border/20 group flex-shrink-0"
    style={{
      background: 'linear-gradient(145deg, hsl(265 45% 15%), hsl(265 40% 9%))',
      boxShadow: '0 4px 20px hsl(0 0% 0% / 0.4)',
    }}
  >
    {channel.logo ? (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <img
          src={channel.logo}
          alt={channel.name}
          className="max-w-[70%] max-h-[70%] object-contain transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
    ) : (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-foreground/70 text-sm font-medium">{channel.name}</span>
      </div>
    )}
    {/* Bottom label */}
    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
      <p className="text-white/80 text-[10px] truncate text-center">{channel.name}</p>
    </div>
    <div className="absolute inset-0 rounded-xl border border-primary/0 group-hover:border-primary/40 transition-colors duration-300 pointer-events-none" />
  </motion.button>
);

export const TrendingCarousel = ({ onSelectItem, channels, onChannelSelect }: TrendingCarouselProps) => {
  const { getTrending } = useTMDB();
  const [trendingItems, setTrendingItems] = useState<TMDBItem[]>([]);

  useEffect(() => {
    getTrending(1).then(items => {
      if (items.length > 0) setTrendingItems(items);
    });
  }, [getTrending]);

  // Take first 10 channels with logos for the channel row
  const channelsWithLogos = (channels || []).filter(c => c.logo).slice(0, 12);

  if (trendingItems.length === 0 && channelsWithLogos.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Trending Movies/Shows Marquee */}
      {trendingItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Trending Now</h3>
          </div>
          <InfiniteMarquee speed={45} direction="left" pauseOnHover>
            {trendingItems.map(item => (
              <PosterCard
                key={item.id}
                item={item}
                onClick={() => onSelectItem?.(item)}
              />
            ))}
          </InfiniteMarquee>
        </div>
      )}

      {/* Live Channels Marquee (opposite direction) */}
      {channelsWithLogos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Live Channels</h3>
          </div>
          <InfiniteMarquee speed={55} direction="right" pauseOnHover>
            {channelsWithLogos.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onClick={() => onChannelSelect?.(channel)}
              />
            ))}
          </InfiniteMarquee>
        </div>
      )}
    </div>
  );
};
