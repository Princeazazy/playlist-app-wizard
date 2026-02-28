import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Radio, Trophy, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/hooks/useIPTV';

interface Match {
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  score: string;
  status: string;
  statusText: string;
  channels: string[];
  league: string;
}

interface LiveMatchesTickerProps {
  sportsChannels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}

export const LiveMatchesTicker = ({ sportsChannels, onChannelSelect }: LiveMatchesTickerProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(matches.length / itemsPerPage);

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-live-matches');
      if (error) throw error;
      if (data?.matches) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.error('Failed to fetch live matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // Auto-scroll pages
  useEffect(() => {
    if (totalPages <= 1 || selectedMatch) return;
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(interval);
  }, [totalPages, selectedMatch]);

  // Find matching sports channels for a given broadcast channel name
  const findMatchingChannels = useCallback((channelNames: string[]): Channel[] => {
    if (!channelNames.length) return [];
    
    const matched: Channel[] = [];
    for (const chName of channelNames) {
      const normalized = chName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      for (const sportsCh of sportsChannels) {
        const sportNorm = sportsCh.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        if (
          sportNorm.includes(normalized) || 
          normalized.includes(sportNorm) ||
          // Match common patterns like "bein sports 1" ↔ "BEIN SPORTS 1 FHD"
          channelFuzzyMatch(chName, sportsCh.name)
        ) {
          matched.push(sportsCh);
        }
      }
    }
    return matched;
  }, [sportsChannels]);

  const channelFuzzyMatch = (broadcastName: string, channelName: string): boolean => {
    const b = broadcastName.toLowerCase();
    const c = channelName.toLowerCase();
    
    // Extract key identifiers
    const beinMatch = b.match(/bein\s*sports?\s*(?:hd\s*)?(\d+)/i);
    const cBeinMatch = c.match(/bein\s*sports?\s*(\d+)/i);
    if (beinMatch && cBeinMatch && beinMatch[1] === cBeinMatch[1]) return true;
    
    // MBC Action
    if (b.includes('mbc action') && c.includes('mbc') && c.includes('action')) return true;
    
    // On Sport
    if (b.includes('أون سبورت') || b.includes('on sport')) {
      const num = b.match(/(\d+)/);
      if (num && c.includes('on') && c.includes('sport') && c.includes(num[1])) return true;
      if (!num && c.includes('on') && c.includes('sport')) return true;
    }
    
    // SSC
    if (b.includes('ssc') && c.includes('ssc')) return true;
    
    // Shahid
    if ((b.includes('شاهد') || b.includes('shahid')) && (c.includes('shahid') || c.includes('شاهد'))) return true;
    
    // Starzplay
    if (b.includes('starzplay') && c.includes('starz')) return true;
    
    return false;
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading live matches...</span>
      </div>
    );
  }

  if (matches.length === 0) return null;

  const visibleMatches = matches.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Today's Matches</h3>
          <span className="text-xs text-muted-foreground">({matches.length})</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentPage(i); setSelectedMatch(null); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentPage ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Match Cards */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {visibleMatches.map((match, idx) => (
              <MatchCard
                key={`${match.homeTeam}-${match.awayTeam}-${currentPage}-${idx}`}
                match={match}
                isSelected={selectedMatch === match}
                onSelect={() => setSelectedMatch(selectedMatch === match ? null : match)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Expanded Channel List when a match is selected */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <MatchChannelList
              match={selectedMatch}
              matchedChannels={findMatchingChannels(selectedMatch.channels)}
              onChannelSelect={onChannelSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MatchCard = ({ match, isSelected, onSelect }: { 
  match: Match; 
  isSelected: boolean; 
  onSelect: () => void;
}) => {
  const isLive = match.status === 'live';
  
  return (
    <motion.div
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={`
        relative p-3 rounded-xl cursor-pointer transition-all border
        ${isSelected 
          ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10' 
          : 'bg-card/80 border-border/30 hover:border-border/60 hover:bg-card'}
      `}
    >
      {/* Live indicator */}
      {isLive && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400">LIVE</span>
        </div>
      )}

      {/* League */}
      <p className="text-[10px] text-muted-foreground truncate mb-2 pr-12">{match.league}</p>

      {/* Teams */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          {match.homeLogo ? (
            <img src={match.homeLogo} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {match.homeTeam.charAt(0)}
            </div>
          )}
          <p className="text-[10px] text-foreground text-center truncate w-full">{match.homeTeam}</p>
        </div>

        <div className="flex flex-col items-center gap-0.5 px-1">
          <span className="text-sm font-bold text-foreground">{match.score}</span>
          <span className="text-[9px] text-muted-foreground">{match.time}</span>
        </div>

        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          {match.awayLogo ? (
            <img src={match.awayLogo} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {match.awayTeam.charAt(0)}
            </div>
          )}
          <p className="text-[10px] text-foreground text-center truncate w-full">{match.awayTeam}</p>
        </div>
      </div>

      {/* Channel badges */}
      {match.channels.length > 0 && (
        <div className="mt-2 flex items-center gap-1 justify-center">
          <Tv className="w-3 h-3 text-primary/60" />
          <span className="text-[9px] text-primary/80 truncate">{match.channels[0]}</span>
        </div>
      )}
    </motion.div>
  );
};

const MatchChannelList = ({ match, matchedChannels, onChannelSelect }: {
  match: Match;
  matchedChannels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}) => {
  return (
    <div className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-2">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {match.homeTeam} vs {match.awayTeam}
        </span>
        <span className="text-xs text-muted-foreground">— Broadcasting Channels</span>
      </div>

      {matchedChannels.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {matchedChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onChannelSelect(ch)}
              className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              {ch.logo ? (
                <img src={ch.logo} alt="" className="w-7 h-7 object-contain rounded" />
              ) : (
                <Tv className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-xs text-foreground truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {match.channels.length > 0 
              ? `Listed on: ${match.channels.join(', ')} — No matching channels found in your playlist`
              : 'Broadcasting channels not yet announced'}
          </span>
        </div>
      )}
    </div>
  );
};
