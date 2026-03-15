import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Radio, Trophy, Clock, Loader2, CalendarDays, RefreshCw, Mic2 } from 'lucide-react';
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
  commentator: string;
  league: string;
  date: string;
  dayLabel?: string;
}

interface LiveMatchesTickerProps {
  sportsChannels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}

type DayTab = 'yesterday' | 'today' | 'tomorrow';

const DAY_LABELS: Record<DayTab, string> = {
  yesterday: "Yesterday's Matches",
  today: "Today's Matches",
  tomorrow: "Tomorrow's Matches",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse?: boolean }> = {
  live: { label: 'LIVE', color: 'bg-red-500', pulse: true },
  halftime: { label: 'HT', color: 'bg-amber-500' },
  finished: { label: 'FT', color: 'bg-muted' },
  upcoming: { label: 'SOON', color: 'bg-primary/60' },
  not_started: { label: 'NS', color: 'bg-muted/60' },
};

export const LiveMatchesTicker = ({ sportsChannels, onChannelSelect }: LiveMatchesTickerProps) => {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeDay, setActiveDay] = useState<DayTab>('today');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [lastFetched, setLastFetched] = useState<string>('');

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fetch-live-matches');
      if (error) throw error;
      if (data?.matches) {
        setAllMatches(data.matches);
        setLastFetched(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to fetch live matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 3 * 60 * 1000); // 3 min refresh
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // Filter by day
  const dayMatches = useMemo(() =>
    allMatches.filter(m => m.dayLabel === activeDay),
    [allMatches, activeDay]
  );

  // Extract unique leagues for current day
  const leagues = useMemo(() => {
    const set = new Set(dayMatches.map(m => m.league).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [dayMatches]);

  // Filter by league
  const filteredMatches = useMemo(() =>
    selectedLeague === 'all' ? dayMatches : dayMatches.filter(m => m.league === selectedLeague),
    [dayMatches, selectedLeague]
  );

  // Count by status for the badge
  const liveCount = useMemo(() => dayMatches.filter(m => m.status === 'live' || m.status === 'halftime').length, [dayMatches]);

  // Day tab counts
  const dayCounts = useMemo(() => ({
    yesterday: allMatches.filter(m => m.dayLabel === 'yesterday').length,
    today: allMatches.filter(m => m.dayLabel === 'today').length,
    tomorrow: allMatches.filter(m => m.dayLabel === 'tomorrow').length,
  }), [allMatches]);

  // Find matching sports channels
  const findMatchingChannels = useCallback((channelNames: string[]): Channel[] => {
    if (!channelNames.length) return [];

    const matched: Channel[] = [];
    const seen = new Set<string>();
    for (const chName of channelNames) {
      for (const sportsCh of sportsChannels) {
        if (seen.has(sportsCh.id)) continue;
        if (channelFuzzyMatch(chName, sportsCh.name)) {
          matched.push(sportsCh);
          seen.add(sportsCh.id);
        }
      }
    }
    return matched;
  }, [sportsChannels]);

  const channelFuzzyMatch = (broadcastName: string, channelName: string): boolean => {
    const b = broadcastName.toLowerCase().trim();
    const c = channelName.toLowerCase().trim();

    // Arabic → English mappings for common channels
    const arabicToEnglish: Record<string, RegExp> = {
      'بي إن سبورت': /bein\s*sport/i,
      'بي ان سبورت': /bein\s*sport/i,
      'ام بي سي أكشن': /mbc\s*action/i,
      'ام بي سي اكشن': /mbc\s*action/i,
      'أبوظبي الرياضية': /abu\s*dhabi\s*sport/i,
      'دبي الرياضية': /dubai\s*sport/i,
      'الكاس': /alkass|al\s*kass/i,
    };

    // Check Arabic name mappings
    for (const [arabic, engRegex] of Object.entries(arabicToEnglish)) {
      if (b.includes(arabic)) {
        // Extract number from Arabic name
        const numMatch = b.match(/(\d+)/);
        if (numMatch) {
          const cNum = c.match(new RegExp(engRegex.source + '\\s*(?:hd\\s*)?(\\d+)', 'i'));
          if (cNum && cNum[1] === numMatch[1]) return true;
        } else {
          if (engRegex.test(c)) return true;
        }
      }
    }

    // beIN Sports with number
    const beinMatch = b.match(/bein\s*sports?\s*(?:hd\s*)?(\d+)/i);
    const cBeinMatch = c.match(/bein\s*sports?\s*(\d+)/i);
    if (beinMatch && cBeinMatch && beinMatch[1] === cBeinMatch[1]) return true;
    if (/^bein\s*sports?\s*(?:hd)?$/i.test(b.trim()) && /bein\s*sport/i.test(c)) return true;

    // SSC with number
    const sscNum = b.match(/ssc\s*(\d+)/i);
    if (sscNum) {
      const cSsc = c.match(/ssc\s*(\d+)/i);
      if (cSsc && cSsc[1] === sscNum[1]) return true;
      return false;
    }

    // On Sport
    const onSportNum = b.match(/(?:أون\s*سبورت|on\s*sport)\s*(\d+)/);
    if (onSportNum) {
      const cOnSport = c.match(/on\s*sport\s*(\d+)/i);
      if (cOnSport && cOnSport[1] === onSportNum[1]) return true;
      return false;
    }
    if ((b.includes('أون سبورت') || /^on\s*sport$/i.test(b)) && /on\s*sport/i.test(c)) return true;

    // Shahid
    if ((b.includes('شاهد') || b.includes('shahid')) && (c.includes('shahid') || c.includes('شاهد'))) return true;

    // StarzPlay
    if (b.includes('starzplay') && c.includes('starz')) return true;

    // MBC Action
    if (b.includes('mbc action') && c.includes('mbc') && c.includes('action')) return true;

    // Abu Dhabi
    if ((b.includes('أبوظبي') || b.includes('abu dhabi')) && b.includes('sport') && c.includes('abu') && c.includes('dhabi')) return true;

    // Dubai Sport
    if ((b.includes('دبي') || b.includes('dubai')) && b.includes('sport') && c.includes('dubai') && c.includes('sport')) return true;

    return false;
  };

  if (loading && allMatches.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading matches...</span>
      </div>
    );
  }

  if (allMatches.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Match Center</h3>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {liveCount} Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-[10px] text-muted-foreground">Updated {lastFetched}</span>
          )}
          <button
            onClick={fetchMatches}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-card border border-border/30 hover:bg-primary/10 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-card border border-border/30">
        {(['yesterday', 'today', 'tomorrow'] as DayTab[]).map(day => (
          <button
            key={day}
            onClick={() => { setActiveDay(day); setSelectedLeague('all'); setSelectedMatch(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeDay === day
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {day === 'yesterday' ? 'Yesterday' : day === 'today' ? 'Today' : 'Tomorrow'}
            {dayCounts[day] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeDay === day ? 'bg-primary-foreground/20' : 'bg-muted'
              }`}>
                {dayCounts[day]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* League Filter */}
      {leagues.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {leagues.map(league => (
            <button
              key={league}
              onClick={() => { setSelectedLeague(league); setSelectedMatch(null); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedLeague === league
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-card border border-border/20 text-muted-foreground hover:text-foreground hover:border-border/50'
              }`}
            >
              {league === 'all' ? '🏆 All Leagues' : league}
            </button>
          ))}
        </div>
      )}

      {/* Matches Grid */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredMatches.map((match, idx) => (
            <MatchCard
              key={`${match.homeTeam}-${match.awayTeam}-${idx}`}
              match={match}
              isSelected={selectedMatch === match}
              onSelect={() => setSelectedMatch(selectedMatch === match ? null : match)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <CalendarDays className="w-8 h-8" />
          <span className="text-sm">No matches scheduled</span>
        </div>
      )}

      {/* Expanded Channel List */}
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

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${config.color}/20`}>
      {config.pulse && <span className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`} />}
      <span className={`text-[10px] font-bold ${
        status === 'live' ? 'text-red-400' :
        status === 'halftime' ? 'text-amber-400' :
        status === 'finished' ? 'text-muted-foreground' :
        'text-muted-foreground'
      }`}>{config.label}</span>
    </div>
  );
};

const MatchCard = ({ match, isSelected, onSelect }: {
  match: Match;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const isLive = match.status === 'live' || match.status === 'halftime';

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-3 rounded-xl cursor-pointer transition-all border
        ${isSelected
          ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
          : isLive
            ? 'bg-card/80 border-red-500/20 hover:border-red-500/40'
            : 'bg-card/80 border-border/30 hover:border-border/60 hover:bg-card'}
      `}
    >
      {/* Status badge */}
      <div className="absolute top-1.5 right-1.5">
        <StatusBadge status={match.status} />
      </div>

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

        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className={`text-lg font-bold ${isLive ? 'text-red-400' : 'text-foreground'}`}>
            {match.score}
          </span>
          <span className="text-[9px] text-muted-foreground">{match.time}</span>
          {match.statusText && (
            <span className={`text-[8px] ${isLive ? 'text-red-400' : 'text-muted-foreground'}`}>
              {match.statusText}
            </span>
          )}
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

      {/* Bottom info: channel + commentator */}
      <div className="mt-2 flex items-center justify-between gap-1">
        {match.channels.length > 0 && (
          <div className="flex items-center gap-1 min-w-0">
            <Tv className="w-3 h-3 text-primary/60 flex-shrink-0" />
            <span className="text-[9px] text-primary/80 truncate">{match.channels[0]}</span>
          </div>
        )}
        {match.commentator && (
          <div className="flex items-center gap-1 min-w-0">
            <Mic2 className="w-2.5 h-2.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[8px] text-muted-foreground truncate">{match.commentator}</span>
          </div>
        )}
      </div>
    </div>
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
        <span className="text-xs text-muted-foreground">— Watch On</span>
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
