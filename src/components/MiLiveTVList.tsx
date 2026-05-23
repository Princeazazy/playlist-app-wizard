import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { LiveMatchesTicker } from './LiveMatchesTicker';
import { ChevronLeft, ChevronRight, Search, Star, Tv, Menu, X, Play, Heart, Loader2, Mic, MicOff, Trophy } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCountryInfo, getCountryFlagUrl, getCategoryEmoji, mergeAndSortGroups, normalizeGroupName, translateGroupName } from '@/lib/countryUtils';
import { matchBrandLogo } from '@/lib/brandLogoService';

import Hls from 'hls.js';
import { supabase } from '@/integrations/supabase/client';
import { useBulkChannelLogos } from '@/hooks/useBulkChannelLogos';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SKY_ENTERTAINMENT_LOGO = '/images/sky-entertainment-logo.png?v=uploaded-sky-entertainment';
const SKY_DOCUMENTARY_LOGO = '/images/sky-documentary-logo.png?v=uploaded-sky-documentary';
const WIKI_COMMONS_LOGO = (file: string) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=512`;
const WIKI_EN_LOGO = (file: string) => `https://en.wikipedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=512`;
const MLB_NETWORK_LOGO = WIKI_EN_LOGO('MLBNetworkLogo.svg');
const NBA_TV_LOGO = WIKI_EN_LOGO('NBA_TV.svg');
const NFL_NETWORK_LOGO = WIKI_EN_LOGO('NFL_Network_logo.svg');
const F1_LOGO = WIKI_COMMONS_LOGO('F1.svg');
const UFC_LOGO = WIKI_COMMONS_LOGO('UFC_Logo.svg');
const ICC_LOGO = WIKI_COMMONS_LOGO('ICC_logo.png');
const ON_LOGO = WIKI_COMMONS_LOGO('ON_logo.png');

// Live Preview Channel Tile with video preview on hover
const LivePreviewChannelTile = memo(({
  channel,
  isActive,
  isFocused,
  isFavorite,
  resolvedLogo,
  onClick,
  onToggleFavorite,
  onHover,
}: {
  channel: Channel;
  isActive?: boolean;
  isFocused?: boolean;
  isFavorite?: boolean;
  resolvedLogo?: string;
  onClick: () => void;
  onToggleFavorite: () => void;
  onHover: (channel: Channel | null) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamProxyUrl = useMemo(() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    if (!supabaseUrl) return '';
    return new URL('functions/v1/stream-proxy', supabaseUrl).toString();
  }, []);

  // Start preview after hover delay
  useEffect(() => {
    if (!isHovered) {
      cleanupHls();
      setPreviewReady(false);
      return;
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      loadPreview();
    }, 600);
    
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isHovered]);

  const loadPreview = async () => {
    const video = videoRef.current;
    if (!video || !channel.url) return;

    setIsPreviewLoading(true);

    const proxyUrl = streamProxyUrl
      ? `${streamProxyUrl}?url=${encodeURIComponent(channel.url)}`
      : channel.url;

    const sourceCandidates: string[] = (() => {
      if (!streamProxyUrl) return [channel.url];
      if (channel.url.startsWith('http://')) return [proxyUrl];
      if (channel.url.startsWith('https://')) return [channel.url, proxyUrl];
      return [channel.url];
    })();

    const tryPreviewSource = async (candidateIndex: number): Promise<void> => {
      const sourceUrl = sourceCandidates[candidateIndex];
      if (!sourceUrl) {
        setIsPreviewLoading(false);
        return;
      }

      const isHlsStream = sourceUrl.includes('.m3u8') || channel.url.includes('.m3u8');

      try {
        if (isHlsStream && Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 5,
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true,
          });

          hlsRef.current = hls;
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.muted = true;
            video.play().then(() => {
              setPreviewReady(true);
              setIsPreviewLoading(false);
            }).catch(() => {
              if (candidateIndex + 1 < sourceCandidates.length) {
                tryPreviewSource(candidateIndex + 1);
                return;
              }
              setIsPreviewLoading(false);
            });
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return;
            if (candidateIndex + 1 < sourceCandidates.length) {
              tryPreviewSource(candidateIndex + 1);
              return;
            }
            setIsPreviewLoading(false);
          });
          return;
        }

        video.src = sourceUrl;
        video.muted = true;
        await video.play();
        setPreviewReady(true);
        setIsPreviewLoading(false);
      } catch {
        if (candidateIndex + 1 < sourceCandidates.length) {
          await tryPreviewSource(candidateIndex + 1);
          return;
        }
        setIsPreviewLoading(false);
      }
    };

    void tryPreviewSource(0);
  };

  const cleanupHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setIsPreviewLoading(false);
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { setIsHovered(true); onHover(channel); }}
      onMouseLeave={() => { setIsHovered(false); onHover(null); }}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group mb-1 ${
        isActive
          ? 'bg-card border-l-4 border-l-accent shadow-lg shadow-accent/10'
          : isFocused
          ? 'bg-card/70'
          : 'hover:bg-card/50'
      }`}
    >
      {/* Channel Logo / Preview */}
      <div className="w-24 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 relative">
        {/* Static logo */}
        {resolvedLogo && !previewReady ? (
          <img
            src={resolvedLogo}
            alt={channel.name}
            loading="lazy"
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.dataset.fallbackApplied !== '1') {
                target.dataset.fallbackApplied = '1';
                target.src = '/placeholder.svg';
              } else {
                target.style.display = 'none';
              }
            }}
          />
        ) : !previewReady && !resolvedLogo ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Tv className="w-8 h-8 text-primary/50" />
          </div>
        ) : null}

        {/* Live Preview Video */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${previewReady ? 'opacity-100' : 'opacity-0'}`}
          playsInline
          muted
        />
        
        {/* Loading indicator */}
        {isPreviewLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {/* Play overlay when not previewing */}
        {!previewReady && !isPreviewLoading && (
          <div className="absolute inset-0 bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-1 left-1">
          <span className="px-1.5 py-0.5 rounded bg-red-500/90 text-[9px] font-bold text-white uppercase">Live</span>
        </div>
      </div>

      {/* Channel Name */}
      <div className="flex-1 text-left min-w-0">
        <h3 className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
          {channel.name}
        </h3>
        {channel.group && (
          <p className="text-xs text-muted-foreground truncate">{channel.group}</p>
        )}
      </div>

      {/* Badges & Favorite */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">HD</span>
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="hover:scale-110 active:scale-90 transition-transform cursor-pointer"
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-accent text-accent' : 'text-muted-foreground hover:text-accent'}`} />
        </span>
      </div>
    </button>
  );
});

const getCategoryInitials = (name: string) => {
  const cleaned = name.replace(/[^\p{L}\p{N}&+\s/]/gu, ' ').trim();
  if (!cleaned) return 'TV';
    if (/24\s*\/\s*7|247/.test(cleaned)) return '24/7';
    if (cleaned.length <= 5 && /^[A-Za-z0-9&+]+$/.test(cleaned)) return cleaned.toUpperCase();
  const words = cleaned.split(/[\s/]+/).filter(Boolean);
  const shortAllCaps = words.find((word) => /^[A-Z0-9&+]{2,5}$/.test(word));
  if (shortAllCaps) return shortAllCaps.slice(0, 4);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'TV';
};

const CategoryLogoFallback = ({ name }: { name: string }) => (
  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/35 via-card to-accent/25 border border-border/40 flex items-center justify-center shadow-inner">
    <span className="text-[11px] font-bold text-foreground tracking-wide max-w-[42px] truncate">
      {getCategoryInitials(name)}
    </span>
  </div>
);

interface MiLiveTVListProps {
  channels: Channel[];
  currentChannel: Channel | null;
  favorites: Set<string>;
  searchQuery: string;
  showFavoritesOnly: boolean;
  onChannelSelect: (channel: Channel) => void;
  onToggleFavorite: (channelId: string) => void;
  onBack: () => void;
  category?: 'live' | 'movies' | 'series' | 'sports';
}

const getCategoryTitle = (category: string): string => {
  switch (category) {
    case 'movies': return 'Movies';
    case 'series': return 'Series';
    case 'sports': return 'Sports Guide';
    default: return "Live TV";
  }
};

export const MiLiveTVList = ({
  channels,
  currentChannel,
  favorites,
  searchQuery,
  showFavoritesOnly,
  onChannelSelect,
  onToggleFavorite,
  onBack,
  category = 'live',
}: MiLiveTVListProps) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('number');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [time, setTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState<Channel | null>(null);
  
  const [localShowFavoritesOnly, setLocalShowFavoritesOnly] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiGroupLogos, setAiGroupLogos] = useState<Record<string, string>>({});
  const aiGroupLogosFetchedRef = useRef(new Set<string>());
  const recognitionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // Pass empty array initially - logos will be resolved lazily after first paint
  const [logoChannelsReady, setLogoChannelsReady] = useState(false);
  const logoChannels = useMemo(() => logoChannelsReady ? channels : [], [logoChannelsReady, channels]);
  const { getLogoForChannel } = useBulkChannelLogos(logoChannels);

  const effectiveSearchQuery = localSearchQuery || searchQuery;

  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setLocalSearchQuery(transcript);
      setShowSearchInput(true);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    setShowSearchInput(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Defer logo fetching until after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setLogoChannelsReady(true), 100);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Sports-specific channel categorization by analyzing channel names
  const categorizeSportsChannel = useCallback((ch: Channel): string => {
    const name = (ch.name || '').toLowerCase();
    const group = (ch.group || '').toLowerCase();

    // beIN Sports
    if (/bein/i.test(name) || /bein/i.test(group)) return 'beIN Sports';
    // SSC (Saudi Sports Company)
    if (/\bssc\b/i.test(name)) return 'Saudi Arabia';
    // Abu Dhabi Sports
    if (/abu\s*dhabi/i.test(name)) return 'UAE';
    // Dubai Sports
    if (/dubai/i.test(name)) return 'UAE';
    // ON Sport (Egypt)
    if (/\bon\s*sport/i.test(name) || /أون\s*سبورت/i.test(name)) return 'Egypt';
    // Nile Sport (Egypt)
    if (/nile/i.test(name)) return 'Egypt';
    // Al Kass (Qatar)
    if (/alkass|al\s*kass|الكاس/i.test(name)) return 'Qatar';
    // KSA Sports
    if (/ksa/i.test(name)) return 'Saudi Arabia';
    // Shahid
    if (/shahid|شاهد/i.test(name) || /shahid/i.test(group)) return 'Shahid';
    // MBC
    if (/\bmbc\b/i.test(name) || /\bmbc\b/i.test(group)) return 'MBC';
    // OSN
    if (/\bosn\b/i.test(name) || /\bosn\b/i.test(group)) return 'OSN';
    // Rotana
    if (/rotana/i.test(name)) return 'Rotana';
    // StarzPlay
    if (/starz/i.test(name)) return 'StarzPlay';
    if (/apple\s*tv\+?|appletv/i.test(name) || /apple\s*tv\+?|appletv/i.test(group)) return 'Apple TV+';
    // DAZN
    if (/dazn/i.test(name)) return 'DAZN';
    if (/\bufc\b|\bmma\b/i.test(name)) return 'UFC & MMA';
    if (/formula\s*1|\bf1\b/i.test(name)) return 'Formula 1';
    if (/cricket|\bicc\b|willow/i.test(name)) return 'Cricket';
    // Sky Sports
    if (/sky\s*sport/i.test(name)) return 'Sky Sports';
    // ESPN
    if (/espn/i.test(name)) return 'ESPN';
    // Fox Sports
    if (/fox\s*sport/i.test(name)) return 'Fox Sports';
    // Eurosport
    if (/eurosport/i.test(name)) return 'Eurosport';
    // BT Sport
    if (/bt\s*sport/i.test(name)) return 'BT Sport';
    if (/\bmlb\b|major\s*league\s*baseball/i.test(name)) return 'MLB Network';
    if (/\bnba\b/i.test(name)) return 'NBA TV';
    if (/\bnfl\b/i.test(name)) return 'NFL Network';
    if (/\bnhl\b/i.test(name)) return 'NHL Network';
    // PPV
    if (/ppv/i.test(name) || /ppv/i.test(group)) return 'PPV';

    // Try Arabic country keywords in name
    if (/مصر|egypt|egyptian/i.test(name)) return 'Egypt';
    if (/سعود|saudi|riyadh/i.test(name)) return 'Saudi Arabia';
    if (/امارات|إمارات|emarat/i.test(name)) return 'UAE';
    if (/قطر|qatar/i.test(name)) return 'Qatar';
    if (/كويت|kuwait/i.test(name)) return 'Kuwait';
    if (/بحرين|bahrain/i.test(name)) return 'Bahrain';
    if (/عمان|oman/i.test(name)) return 'Oman';
    if (/اردن|أردن|jordan/i.test(name)) return 'Jordan';
    if (/لبنان|lebanon/i.test(name)) return 'Lebanon';
    if (/عراق|iraq/i.test(name)) return 'Iraq';
    if (/مغرب|morocco/i.test(name)) return 'Morocco';
    if (/تونس|tunisia/i.test(name)) return 'Tunisia';
    if (/جزائر|algeria/i.test(name)) return 'Algeria';
    if (/ليبيا|libya/i.test(name)) return 'Libya';
    if (/سودان|sudan/i.test(name)) return 'Sudan';
    if (/سوري|syria/i.test(name)) return 'Syria';
    if (/فلسطين|palest/i.test(name)) return 'Palestine';
    if (/يمن|yemen/i.test(name)) return 'Yemen';

    // Try group-based country detection
    if (/egypt|مصر/i.test(group)) return 'Egypt';
    if (/saudi|سعود/i.test(group)) return 'Saudi Arabia';
    if (/uae|امارات|إمارات/i.test(group)) return 'UAE';
    if (/qatar|قطر/i.test(group)) return 'Qatar';
    if (/kuwait|كويت/i.test(group)) return 'Kuwait';
    if (/jordan|اردن/i.test(group)) return 'Jordan';
    if (/iraq|عراق/i.test(group)) return 'Iraq';
    if (/morocco|مغرب/i.test(group)) return 'Morocco';
    if (/tunisia|تونس/i.test(group)) return 'Tunisia';
    if (/algeria|جزائر/i.test(group)) return 'Algeria';

    // Fallback: use normalized group
    return normalizeGroupName(ch.group || 'Other') || 'Other';
  }, []);

  // Sports-specific logo for categories - brand logos for services, flags only for real countries
  const SPORTS_GROUP_META: Record<string, { flagUrl: string; priority: number; isService?: boolean }> = {
    'Egypt': { flagUrl: 'https://flagcdn.com/w160/eg.png', priority: 1 },
    'Saudi Arabia': { flagUrl: 'https://flagcdn.com/w160/sa.png', priority: 2 },
    'UAE': { flagUrl: 'https://flagcdn.com/w160/ae.png', priority: 3 },
    'Qatar': { flagUrl: 'https://flagcdn.com/w160/qa.png', priority: 4 },
    'Kuwait': { flagUrl: 'https://flagcdn.com/w160/kw.png', priority: 5 },
    'Bahrain': { flagUrl: 'https://flagcdn.com/w160/bh.png', priority: 6 },
    'Oman': { flagUrl: 'https://flagcdn.com/w160/om.png', priority: 7 },
    'Jordan': { flagUrl: 'https://flagcdn.com/w160/jo.png', priority: 8 },
    'Lebanon': { flagUrl: 'https://flagcdn.com/w160/lb.png', priority: 9 },
    'Iraq': { flagUrl: 'https://flagcdn.com/w160/iq.png', priority: 10 },
    'Palestine': { flagUrl: 'https://flagcdn.com/w160/ps.png', priority: 11 },
    'Morocco': { flagUrl: 'https://flagcdn.com/w160/ma.png', priority: 12 },
    'Tunisia': { flagUrl: 'https://flagcdn.com/w160/tn.png', priority: 13 },
    'Algeria': { flagUrl: 'https://flagcdn.com/w160/dz.png', priority: 14 },
    'Libya': { flagUrl: 'https://flagcdn.com/w160/ly.png', priority: 15 },
    'Sudan': { flagUrl: 'https://flagcdn.com/w160/sd.png', priority: 16 },
    'Syria': { flagUrl: 'https://flagcdn.com/w160/sy.png', priority: 17 },
    'Yemen': { flagUrl: 'https://flagcdn.com/w160/ye.png', priority: 18 },
    'beIN Sports': { flagUrl: '/images/bein-logo.png', priority: 20, isService: true },
    'Shahid': { flagUrl: '/images/shahid-logo.png?v=2', priority: 21, isService: true },
    'MBC': { flagUrl: '/images/mbc-logo.png', priority: 22, isService: true },
    'OSN': { flagUrl: '/images/osn-logo.png', priority: 23, isService: true },
    'Rotana': { flagUrl: '/images/rotana-logo.png', priority: 24, isService: true },
    'UEFA': { flagUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/UEFA_logo.svg/200px-UEFA_logo.svg.png', priority: 25, isService: true },
    'League One': { flagUrl: '/images/league-one-logo-v2.png', priority: 26, isService: true },
    'League Two': { flagUrl: '/images/league-two-logo-v2.png', priority: 27, isService: true },
    'La Liga': { flagUrl: '/images/laliga-logo.png', priority: 28, isService: true },
    'Sky Sports': { flagUrl: matchBrandLogo('sky sports') || '', priority: 30, isService: true },
    'ESPN': { flagUrl: matchBrandLogo('espn') || '', priority: 31, isService: true },
    'DAZN': { flagUrl: matchBrandLogo('dazn') || '', priority: 32, isService: true },
    'Fox Sports': { flagUrl: matchBrandLogo('fox sports') || '', priority: 33, isService: true },
    'Eurosport': { flagUrl: matchBrandLogo('eurosport') || '', priority: 34, isService: true },
    'BT Sport': { flagUrl: matchBrandLogo('bt sport') || '', priority: 35, isService: true },
    'StarzPlay': { flagUrl: matchBrandLogo('starz') || '', priority: 36, isService: true },
    'PPV': { flagUrl: '', priority: 37, isService: true },
    'MLB Network': { flagUrl: MLB_NETWORK_LOGO, priority: 38, isService: true },
    'NBA TV': { flagUrl: NBA_TV_LOGO, priority: 39, isService: true },
    'NFL Network': { flagUrl: NFL_NETWORK_LOGO, priority: 40, isService: true },
    'NHL Network': { flagUrl: matchBrandLogo('nhl network') || '', priority: 41, isService: true },
    'UFC & MMA': { flagUrl: UFC_LOGO, priority: 42, isService: true },
    'Formula 1': { flagUrl: F1_LOGO, priority: 43, isService: true },
    'Cricket': { flagUrl: ICC_LOGO, priority: 44, isService: true },
    'Apple TV+': { flagUrl: matchBrandLogo('apple tv') || '', priority: 45, isService: true },
  };

  // Build a mapping from channel id → sports group name (only for sports mode)
  const sportsChannelGroupMap = useMemo(() => {
    if (category !== 'sports') return new Map<string, string>();
    const map = new Map<string, string>();
    for (const ch of channels) {
      map.set(ch.id, categorizeSportsChannel(ch));
    }
    return map;
  }, [channels, category, categorizeSportsChannel]);

  // Build groups with first channel logo AND normalized group map in a single pass
  const { groupsWithLogos, normalizedGroupMap } = useMemo(() => {
    const groupData = new Map<string, {
      count: number;
      firstLogo?: string;
      secondLogo?: string;
      originalNames: string[];
      displayNameOverride?: string;
      brandLogo?: string;
    }>();
    const normMap = new Map<string, string[]>();

    if (category === 'sports') {
      // Sports mode: use smart categorization
      for (const ch of channels) {
        const sportsGroup = sportsChannelGroupMap.get(ch.id) || 'Other';
        const existing = groupData.get(sportsGroup);
        if (!existing) {
          groupData.set(sportsGroup, { count: 1, firstLogo: ch.logo, originalNames: [sportsGroup] });
          normMap.set(sportsGroup, [sportsGroup]);
        } else {
          existing.count++;
          if (existing.count === 2 && ch.logo && !existing.secondLogo) {
            existing.secondLogo = ch.logo;
          }
        }
      }
    } else {
      for (const ch of channels) {
        const group = ch.group || 'Uncategorized';
        const normalizedKey = normalizeGroupName(group);
        const existing = groupData.get(normalizedKey);
        if (!existing) {
          groupData.set(normalizedKey, { count: 1, firstLogo: ch.logo, originalNames: [group] });
          normMap.set(normalizedKey, [group]);
        } else {
          existing.count++;
          if (existing.count === 2 && ch.logo && !existing.secondLogo) {
            existing.secondLogo = ch.logo;
          }
          if (!existing.originalNames.includes(group)) {
            existing.originalNames.push(group);
            const normList = normMap.get(normalizedKey)!;
            if (!normList.includes(group)) normList.push(group);
          }
        }
      }
    }

    // Post-process: detect service-specific groups by sampling channel names
    if (category !== 'sports') {
      const SERVICE_PATTERNS: { regex: RegExp; name: string; logoKey: 'first' | 'second' | 'predefined'; predefinedLogo?: string }[] = [
        { regex: /\bstarz\b|ستارز/i, name: 'Starzplay', logoKey: 'predefined', predefinedLogo: '/images/starzplay-logo.png' },
        { regex: /\bmbc\b/i, name: 'MBC', logoKey: 'predefined', predefinedLogo: '/images/mbc-group-logo.png' },
        { regex: /\bjawy\b|\bjawwy\b|جوي/i, name: 'Jawwy', logoKey: 'predefined', predefinedLogo: '/images/jawwy-logo.png' },
        { regex: /\btod\b/i, name: 'TOD', logoKey: 'first' },
        { regex: /\balwan\b|ألوان|الوان/i, name: 'Alwan Entertainment', logoKey: 'predefined', predefinedLogo: '/images/alwan-round-logo.png' },
        { regex: /\bvictory\b/i, name: 'US Victory', logoKey: 'predefined', predefinedLogo: '/images/us-victory-round-logo.png' },
      ];

      for (const [normKey, data] of groupData.entries()) {
        const info = getCountryInfo(data.originalNames[0] || normKey);
        const isGenericArabic = info?.code === 'arabic' || info?.code === 'gulf' || (!info?.isStreamingService && !info);
        if (!isGenericArabic) continue;

        const groupOrigNames = normMap.get(normKey) || [];
        const sampleChannels = channels
          .filter(ch => groupOrigNames.includes(ch.group || 'Uncategorized'))
          .slice(0, 10);

        for (const pattern of SERVICE_PATTERNS) {
          const matchCount = sampleChannels.filter(ch => pattern.regex.test(ch.name)).length;
          if (matchCount >= Math.min(3, sampleChannels.length * 0.3)) {
            const newKey = pattern.name.toLowerCase();
            if (!groupData.has(newKey)) {
              groupData.delete(normKey);
              const logo = pattern.logoKey === 'predefined'
                ? pattern.predefinedLogo
                : pattern.logoKey === 'second'
                  ? (data.secondLogo || data.firstLogo)
                  : data.firstLogo;
              groupData.set(newKey, { ...data, firstLogo: logo, displayNameOverride: pattern.name });
              normMap.delete(normKey);
              normMap.set(newKey, groupOrigNames);
            }
            break;
          }
        }
      }

      // Post-process: for groups with GENERIC names (Movies, Music, News, Sports, Kids, etc.),
      // sniff the dominant service brand from channel names and rename the group accordingly
      // (e.g. UK | Movies full of "UK - SKY CINEMA ..." channels → "Sky Cinema Movies").
      const GENERIC_NAME_REGEX = /\b(movies?|cinema|music|news|sports?|kids?|entertainment|documentary|documentaries|series|drama|comedy|general|family|shows?)\b/i;
      const CB = (d: string) => `https://logo.clearbit.com/${d}`;
      const BRAND_SNIFFERS: { regex: RegExp; brand: string; logo?: string }[] = [
        // Sky family
        { regex: /\bsky\s*cinema\b|\bsky\s*movies?\b/i, brand: 'Sky Cinema', logo: '/images/sky-movies-round-logo.png' },
        { regex: /\bsky\s*(documentary|documentaries|docs?)\b/i, brand: 'Sky Documentary', logo: SKY_DOCUMENTARY_LOGO },
        { regex: /\bsky\s*(entertainment|one|atlantic|showcase|witness|comedy|max)\b/i, brand: 'Sky Entertainment', logo: SKY_ENTERTAINMENT_LOGO },
        { regex: /\bsky\s*sports?\s*f1\b/i, brand: 'Sky Sports F1', logo: CB('skysports.com') },
        { regex: /\bsky\s*sports?\b/i, brand: 'Sky Sports', logo: CB('skysports.com') },
        { regex: /\bsky\s*news\s*arabia|سكاي\s*نيوز\s*عربية/i, brand: 'Sky News Arabia', logo: CB('skynewsarabia.com') },
        { regex: /\bsky\s*news\b/i, brand: 'Sky News', logo: CB('news.sky.com') },
        // (Sky Entertainment handled above with round logo)
        { regex: /\bsky\b/i, brand: 'Sky', logo: CB('sky.com') },
        // UK terrestrial
        { regex: /\bbbc\b/i, brand: 'BBC', logo: CB('bbc.co.uk') },
        { regex: /\bitv\b/i, brand: 'ITV', logo: CB('itv.com') },
        { regex: /\bchannel\s*4|\bch4\b|\bc4\b|\be4\b|\bfilm4\b/i, brand: 'Channel 4', logo: CB('channel4.com') },
        { regex: /\bchannel\s*5|\bch5\b/i, brand: 'Channel 5', logo: CB('channel5.com') },
        // Discovery family
        { regex: /\bdiscovery\b/i, brand: 'Discovery', logo: matchBrandLogo('discovery') || CB('discovery.com') },
        { regex: /\bnat(ional)?\s*geo(graphic)?\b|\bnat\s*geo\b|\bngc\b/i, brand: 'National Geographic', logo: CB('nationalgeographic.com') },
        { regex: /\banimal\s*planet\b/i, brand: 'Animal Planet', logo: CB('animalplanet.com') },
        { regex: /\btlc\b/i, brand: 'TLC', logo: CB('tlc.com') },
        { regex: /\bhistory\b/i, brand: 'History', logo: CB('history.com') },
        // Music
        { regex: /\bmtv\b/i, brand: 'MTV', logo: CB('mtv.com') },
        { regex: /\bvh1\b/i, brand: 'VH1', logo: CB('vh1.com') },
        // Kids
        { regex: /\bdisney\s*(jr|junior|xd)?\b/i, brand: 'Disney', logo: CB('disneychannel.com') },
        { regex: /\bcartoon\s*network|\bcn\b/i, brand: 'Cartoon Network', logo: CB('cartoonnetwork.com') },
        { regex: /\bnick(elodeon)?\b/i, brand: 'Nickelodeon', logo: CB('nick.com') },
        { regex: /\bboomerang\b/i, brand: 'Boomerang', logo: CB('boomerang.com') },
        // US news / general
        { regex: /\bcnn\b/i, brand: 'CNN', logo: CB('cnn.com') },
        { regex: /\bmsnbc\b/i, brand: 'MSNBC', logo: CB('msnbc.com') },
        { regex: /\bfox\s*news\b/i, brand: 'Fox News', logo: CB('foxnews.com') },
        { regex: /\bbloomberg\b/i, brand: 'Bloomberg', logo: CB('bloomberg.com') },
        { regex: /\beuronews\b/i, brand: 'Euronews', logo: CB('euronews.com') },
        { regex: /\bfrance\s*24\b/i, brand: 'France 24', logo: CB('france24.com') },
        { regex: /\bnbc\b/i, brand: 'NBC', logo: matchBrandLogo('nbc') || CB('nbc.com') },
        { regex: /\bcbs\b/i, brand: 'CBS', logo: '/images/cbs-round-logo.png?v=uploaded-cbs' },
        { regex: /\babc\b/i, brand: 'ABC', logo: CB('abc.com') },
        { regex: /\bfox\b/i, brand: 'FOX', logo: matchBrandLogo('fox') || CB('fox.com') },
        { regex: /\bcomedy\s*central\b/i, brand: 'Comedy Central', logo: CB('cc.com') },
        { regex: /\bamc\b/i, brand: 'AMC', logo: CB('amc.com') },
        { regex: /\bsyfy\b/i, brand: 'Syfy', logo: CB('syfy.com') },
        { regex: /\btnt\b/i, brand: 'TNT', logo: CB('tntdrama.com') },
        { regex: /\btbs\b/i, brand: 'TBS', logo: CB('tbs.com') },
        { regex: /\bhgtv\b/i, brand: 'HGTV', logo: CB('hgtv.com') },
        { regex: /\bfood\s*network\b/i, brand: 'Food Network', logo: CB('foodnetwork.com') },
        { regex: /\bpbs\b/i, brand: 'PBS', logo: matchBrandLogo('pbs') || CB('pbs.org') },
        // Sports
        { regex: /\bespn\b/i, brand: 'ESPN', logo: CB('espn.com') },
        { regex: /\beurosport\b/i, brand: 'Eurosport', logo: CB('eurosport.com') },
        { regex: /\btnt\s*sports?|bt\s*sport\b/i, brand: 'TNT Sports', logo: CB('tntsports.co.uk') },
        { regex: /\bnba\b/i, brand: 'NBA', logo: '/images/nba-round-logo.png' },
        { regex: /\bnfl\b/i, brand: 'NFL', logo: '/images/nfl-round-logo.png' },
        { regex: /\bnhl\b/i, brand: 'NHL', logo: '/images/nhl-round-logo.png' },
        { regex: /\bmlb\b/i, brand: 'MLB', logo: '/images/mlb-round-logo.png' },
        { regex: /\bmoto\s*gp\b/i, brand: 'MotoGP', logo: CB('motogp.com') },
        { regex: /\bworld\s*cup|كأس\s*العالم|مونديال/i, brand: 'World Cup', logo: '/images/world-cup-logo.png' },
        { regex: /\bchampions\s*league|دوري\s*الابطال/i, brand: 'Champions League', logo: '/images/champions-league-logo.png' },
        { regex: /\bbein\b/i, brand: 'beIN', logo: '/images/bein-logo.png' },
        // European
        { regex: /\bcanal\+?|\bcanal\s*plus\b/i, brand: 'Canal+', logo: CB('canalplus.com') },
        { regex: /\btf1\b/i, brand: 'TF1', logo: CB('tf1.fr') },
        { regex: /\brtl\b/i, brand: 'RTL', logo: CB('rtl.de') },
        { regex: /\bzdf\b/i, brand: 'ZDF', logo: CB('zdf.de') },
        { regex: /\bard\b/i, brand: 'ARD', logo: CB('ard.de') },
        { regex: /\brai\b/i, brand: 'RAI', logo: CB('rai.it') },
        // Arabic
        { regex: /\bal[\s-]?jazeera|الجزيرة/i, brand: 'Al Jazeera', logo: matchBrandLogo('al jazeera') || CB('aljazeera.com') },
        { regex: /\bal[\s-]?arabiya|العربية/i, brand: 'Al Arabiya', logo: matchBrandLogo('al arabiya') || CB('alarabiya.net') },
        { regex: /\bal[\s-]?hadath|الحدث/i, brand: 'Al Hadath', logo: matchBrandLogo('al hadath') || CB('alarabiya.net') },
        { regex: /\bal[\s-]?mayadeen|الميادين/i, brand: 'Al Mayadeen', logo: matchBrandLogo('al mayadeen') || CB('almayadeen.net') },
        { regex: /\bmbc\b/i, brand: 'MBC', logo: '/images/mbc-group-logo.png' },
        { regex: /\brotana\b|روتانا/i, brand: 'Rotana', logo: '/images/rotana-logo.png' },
        { regex: /\bosn\b/i, brand: 'OSN', logo: '/images/osn-logo.png' },
        { regex: /\bdmc\b/i, brand: 'DMC', logo: CB('dmc.eg') },
        { regex: /\bon[\s-]?(tv|e)\b/i, brand: 'ON', logo: CB('ontvegypt.tv') },
        { regex: /\bcbc\b/i, brand: 'CBC', logo: CB('cbc-eg.com') },
        { regex: /\bal[\s-]?nahar|النهار/i, brand: 'Al Nahar', logo: CB('alnaharegypt.com') },
        { regex: /\bssc\b/i, brand: 'SSC', logo: matchBrandLogo('ssc') || undefined },
        // Abu Dhabi & Dubai are emirates — treated as UAE via country detection, no sniffer override

        // Niche sports
        { regex: /\bpdc\b|\bdarts?\b/i, brand: 'PDC Darts', logo: matchBrandLogo('pdc') || undefined },
        { regex: /\bcricket\b|\bicc\b|\bwillow\b/i, brand: 'Cricket', logo: matchBrandLogo('cricket') || undefined },
        { regex: /\brugby\b|six\s*nations/i, brand: 'Rugby', logo: matchBrandLogo('rugby') || undefined },
        { regex: /\btennis\b|\batp\b|\bwta\b/i, brand: 'Tennis', logo: matchBrandLogo('tennis') || undefined },
        { regex: /\bgolf\b|\bpga\b/i, brand: 'Golf', logo: CB('golfchannel.com') },
        { regex: /\bboxing\b|\bwbc\b/i, brand: 'Boxing', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/World_Boxing_Council_logo.svg/512px-World_Boxing_Council_logo.svg.png' },
        { regex: /\bwwe\b|wrestling/i, brand: 'WWE', logo: CB('wwe.com') },
        { regex: /\bufc\b/i, brand: 'UFC', logo: CB('ufc.com') },
        { regex: /\bformula\s*1|\bf1\b/i, brand: 'Formula 1', logo: CB('formula1.com') },
        // US extras
        { regex: /\bahc\b|american\s*heroes/i, brand: 'American Heroes', logo: matchBrandLogo('american heroes') || undefined },
        { regex: /\bhallmark\b/i, brand: 'Hallmark', logo: CB('hallmarkchannel.com') },
        { regex: /\btravel\s*channel\b/i, brand: 'Travel Channel', logo: CB('travelchannel.com') },
        { regex: /\bsmithsonian\b/i, brand: 'Smithsonian', logo: CB('smithsonianchannel.com') },
        { regex: /\bscience\s*(channel)?\b/i, brand: 'Science Channel', logo: CB('sciencechannel.com') },
        { regex: /\bmotor\s*trend\b/i, brand: 'MotorTrend', logo: CB('motortrend.com') },
        { regex: /\bcinemax\b/i, brand: 'Cinemax', logo: CB('cinemax.com') },
        { regex: /\bshowtime\b/i, brand: 'Showtime', logo: CB('sho.com') },
        { regex: /\boxygen\b/i, brand: 'Oxygen', logo: CB('oxygen.com') },
        { regex: /\bbravo\b/i, brand: 'Bravo', logo: CB('bravotv.com') },
        { regex: /\blifetime\b/i, brand: 'Lifetime', logo: CB('mylifetime.com') },
        { regex: /\binvestigation\s*discovery\b|\bid\s*channel\b/i, brand: 'Investigation Discovery', logo: CB('investigationdiscovery.com') },
        { regex: /\ba\s*&\s*e\b|\baetv\b/i, brand: 'A&E', logo: CB('aetv.com') },
        { regex: /\bfxx?\b/i, brand: 'FX', logo: CB('fxnetworks.com') },
        { regex: /\btnt\s*sports?|bt\s*sport\b/i, brand: 'TNT Sports', logo: CB('tntsports.co.uk') },
        // Faith / community
        { regex: /\bvictory\b|\bvc\b/i, brand: 'US Victory', logo: '/images/us-victory-round-logo.png' },
        // Arabic entertainment
        { regex: /\balwan\b|ألوان|الوان/i, brand: 'Alwan Entertainment', logo: '/images/alwan-round-logo.png' },
        // Football leagues
        { regex: /\bserie\s*a\b/i, brand: 'Serie A', logo: matchBrandLogo('serie a') || undefined },
      ];

      for (const [normKey, data] of groupData.entries()) {
        const baseName = (data.displayNameOverride || data.originalNames[0] || normKey).trim();
        // Skip if already retitled by SERVICE_PATTERNS above to a non-generic brand
        if (data.displayNameOverride && !GENERIC_NAME_REGEX.test(data.displayNameOverride)) continue;
        const isGeneric = GENERIC_NAME_REGEX.test(baseName);

        const groupOrigNames = normMap.get(normKey) || [];
        const sampleChannels = channels
          .filter(ch => groupOrigNames.includes(ch.group || 'Uncategorized'))
          .slice(0, 12);
        if (sampleChannels.length === 0) continue;

        let bestBrand: { brand: string; logo?: string; count: number } | null = null;
        for (const sniffer of BRAND_SNIFFERS) {
          // Match in channel names AND group name itself (so single-brand groups like "Darts" get sniffed)
          const nameMatches = sampleChannels.filter(ch => sniffer.regex.test(ch.name || '')).length;
          const groupNameMatch = sniffer.regex.test(baseName) ? Math.max(2, Math.ceil(sampleChannels.length * 0.5)) : 0;
          const count = Math.max(nameMatches, groupNameMatch);
          // Lower threshold (25%) when sniffing, but require group-name OR >=2 channels
          if (count >= Math.max(2, Math.ceil(sampleChannels.length * 0.25))) {
            if (!bestBrand || count > bestBrand.count) {
              // Prefer the centralized brand catalog URL (reliable Wikipedia logos)
              // over the inline CB() fallback bundled with each sniffer rule.
              const catalogLogo = matchBrandLogo(sniffer.brand);
              bestBrand = { brand: sniffer.brand, logo: catalogLogo || sniffer.logo, count };
            }
          }
        }
        if (!bestBrand) continue;

        // For generic groups: "{Brand} {Generic}". For non-generic: just the brand.
        if (isGeneric) {
          const genericWordMatch = baseName.match(GENERIC_NAME_REGEX);
          const genericWord = genericWordMatch
            ? genericWordMatch[0].charAt(0).toUpperCase() + genericWordMatch[0].slice(1).toLowerCase()
            : '';
          data.displayNameOverride = genericWord ? `${bestBrand.brand} ${genericWord}` : bestBrand.brand;
        } else {
          data.displayNameOverride = bestBrand.brand;
        }
        if (bestBrand.logo) {
          data.brandLogo = bestBrand.logo;
          data.firstLogo = bestBrand.logo;
        }
      }

      // Post-process: for US sub-groups, use the 2nd channel as the source of truth for name + logo
      const US_NETWORK_EXPANSIONS: Record<string, string> = {
        AHC: 'American Heroes',
        AHL: 'AHL Hockey',
        AMC: 'AMC',
        AE: 'A&E',
        FX: 'FX',
        FXX: 'FX',
        TBS: 'TBS',
        TNT: 'TNT',
        USA: 'USA Network',
        SYFY: 'Syfy',
        HBO: 'HBO',
        HGTV: 'HGTV',
        TLC: 'TLC',
        CW: 'The CW',
        ION: 'ION TV',
        PBS: 'PBS',
        ABC: 'ABC',
        CBS: 'CBS',
        NBC: 'NBC',
        FOX: 'FOX',
        ESPN: 'ESPN',
        ESPN2: 'ESPN 2',
        FS1: 'Fox Sports 1',
        FS2: 'Fox Sports 2',
        BTN: 'Big Ten Network',
        BIGTEN: 'Big Ten Network',
        SPECTRUM: 'Spectrum News',
        SPECTRUMNEWS: 'Spectrum News',
        MLB: 'MLB Network',
        NFL: 'NFL Network',
        NHL: 'NHL Network',
        NBA: 'NBA TV',
        SHOWTIME: 'Showtime',
        STARZ: 'Starz',
        CINEMAX: 'Cinemax',
        BRAVO: 'Bravo',
        LIFETIME: 'Lifetime',
        OXYGEN: 'Oxygen',
        HALLMARK: 'Hallmark',
        MOTORTREND: 'MotorTrend',
        SMITHSONIAN: 'Smithsonian',
        SCIENCE: 'Science Channel',
        DISCOVERY: 'Discovery',
        HISTORY: 'History',
        NATGEO: 'National Geographic',
        TRUTV: 'truTV',
        FOOD: 'Food Network',
        TRAVEL: 'Travel Channel',
        ID: 'Investigation Discovery',
        NICK: 'Nickelodeon',
        DISNEY: 'Disney',
        CARTOONNETWORK: 'Cartoon Network',
        BOOMERANG: 'Boomerang',
        MTV: 'MTV',
        VH1: 'VH1',
        BET: 'BET',
        CNN: 'CNN',
        MSNBC: 'MSNBC',
        FOXNEWS: 'Fox News',
        BLOOMBERG: 'Bloomberg',
        TELEMUNDO: 'Telemundo',
        UNIVISION: 'Univision',
        UNIMAS: 'UniMás',
        UNIMÁS: 'UniMás',
        UNI: 'Univision',
      };

      const cleanUsNetworkName = (rawName: string): string | null => {
        let cleaned = rawName
          .replace(/^[#\-\s|]+/, '')
          .replace(/^(?:MYHD\s*-\s*|AM\s*\|\s*|AR\s*\|\s*|US\s*\|\s*)/i, '')
          .trim();

        const explicitMatch = cleaned.match(/\b(?:US[\s-]*)?(ABC|CBS|NBC|FOX|CW|PBS|ION|MYTV|MYTV9|TELEMUNDO|UNIM[ÁA]S|UNIVISION|UNI|TBS|TNT|AMC|A&E|FX|FXX|USA|SYFY|HBO|SHOWTIME|STARZ|DISCOVERY|HISTORY|LIFETIME|BRAVO|E!|HGTV|FOOD|TRUTV|COMEDY\s*CENTRAL|NICK|DISNEY|CARTOON\s*NETWORK|AHC|AHL|HALLMARK|TRAVEL|SMITHSONIAN|SCIENCE|MOTORTREND|CINEMAX|OXYGEN|ESPN2?|FS1|FS2|BTN|BIG\s*TEN|SPECTRUM(?:\s*NEWS)?|MLB|NFL|NHL|NBA)\b/i);
        if (explicitMatch) {
          const network = explicitMatch[1].toUpperCase().replace(/\s+/g, '');
          return US_NETWORK_EXPANSIONS[network] || network;
        }

        const prefixMatch = cleaned.match(/^(US[\s-]*[A-Z0-9&+]{2,15})\b/i);
        if (prefixMatch) {
          const tok = prefixMatch[1].toUpperCase().replace(/^US[\s-]*/, '').replace(/\s+/g, '');
          return US_NETWORK_EXPANSIONS[tok] || `US ${tok}`;
        }

        const firstToken = cleaned.split(/\s+/)[0]?.replace(/[^A-Za-z0-9&+\-]/g, '');
        if (!firstToken || /^\d+$/.test(firstToken) || firstToken.length < 2) return null;
        const tokUpper = firstToken.toUpperCase();
        return US_NETWORK_EXPANSIONS[tokUpper] || `US ${tokUpper}`;
      };

      // Predefined logos for known US networks (by network token, post-expansion key)
      const US_NETWORK_LOGOS: Record<string, string> = {
        'HBO': '/images/hbo-logo.png',
        'FOX': '/images/fox-round-logo.svg',
        'NBC': '/images/nbc-round-logo.png',
        'PBS': '/images/pbs-round-logo.png',
        'UNIVISION': '/images/univision-round-logo.svg',
        'UNIMAS': '/images/unimas-round-logo.svg',
        'SPECTRUMNEWS': '/images/spectrum-news-round-logo.svg',
        'BIGTENNETWORK': '/images/big-ten-round-logo.svg',
        'AMERICANHEROES': '/images/american-heroes-round-logo.svg',
        'DISCOVERY': '/images/discovery-round-logo.svg',
        'USCM': '/images/cinemania-round-logo.svg',
      };

      for (const [normKey, data] of groupData.entries()) {
        if (!normKey.startsWith('us_') || normKey === 'us') continue;

        const groupOrigNames = normMap.get(normKey) || [];
        const groupChannels = channels.filter(ch => groupOrigNames.includes(ch.group || 'Uncategorized'));
        const sourceChannel = groupChannels[1] || groupChannels.find(ch => ch.logo || ch.name?.trim()) || groupChannels[0];
        if (!sourceChannel) continue;

        const networkName = cleanUsNetworkName(sourceChannel.name);
        if (networkName) {
          data.displayNameOverride = networkName;
          // Prefer brand-matched logo (uses the rich BRAND_LOGOS catalog incl. AHC/Hallmark/etc.)
          const brandLogo = matchBrandLogo(networkName);
          if (brandLogo) {
            data.brandLogo = brandLogo;
            data.firstLogo = brandLogo;
          } else {
            const networkKey = networkName.replace(/^US[\s-]*/i, '').toUpperCase().replace(/\s+/g, '');
            if (US_NETWORK_LOGOS[networkKey]) {
              data.firstLogo = US_NETWORK_LOGOS[networkKey];
            } else if (sourceChannel.logo) {
              data.firstLogo = sourceChannel.logo;
            }
          }
        } else if (sourceChannel.logo) {
          data.firstLogo = sourceChannel.logo;
        }
      }
    }

    return { groupsWithLogos: groupData, normalizedGroupMap: normMap };
  }, [channels, category, sportsChannelGroupMap]);

  const groups = useMemo(() => {
    if (category === 'sports') {
      // Sort sports groups by priority
      const entries = Array.from(groupsWithLogos.entries())
        .filter(([_, data]) => data.count >= 1)
        .map(([name, data]) => {
          const meta = SPORTS_GROUP_META[name];
          return {
            name,
            displayName: name,
            count: data.count,
            firstLogo: meta?.flagUrl || data.firstLogo,
            originalNames: data.originalNames,
            priority: meta?.priority ?? 999,
          };
        })
        .sort((a, b) => a.priority - b.priority);
      return entries;
    }
    return mergeAndSortGroups(groupsWithLogos);
  }, [groupsWithLogos, category]);

  // Section classifier for Live TV sidebar (English / Streaming Platforms / Sports / Other).
  // Arabic groups stay at the top of the list as before (Al Jazeera, country priority).
  type LiveSection = 'arabic' | 'english' | 'streaming' | 'sports' | 'other';
  const SECTION_ORDER: LiveSection[] = ['arabic', 'streaming', 'english', 'sports', 'other'];
  const SECTION_LABELS: Record<LiveSection, string> = {
    arabic: 'Arabic',
    english: 'English',
    streaming: 'Streaming Platforms',
    sports: 'Sports',
    other: 'Other',
  };

  const classifyLiveSection = useCallback((group: { name: string; displayName: string; originalNames: string[] }): LiveSection => {
    const name = (group.displayName || '').toLowerCase();
    const orig = (group.originalNames?.[0] || '').toLowerCase();
    const all = `${name} ${orig}`;
    const info = getCountryInfo(group.originalNames?.[0] || group.displayName);

    if (/\b(ba|bosnia|bosna|босна|ireland|irish|portugal|portuguese)\b|\b(?:ie|pt)[_\s|-]/i.test(all)) return 'other';

    // Sports first (strong signals beat country detection — e.g. "UK Sports" is Sports, not English)
    const sportsKw = ['sport', 'espn', 'bein', 'dazn', 'fox sports', 'sky sports', 'eurosport', 'bt sport', 'tnt sports', 'nfl', 'nba', 'mlb', 'nhl', 'ufc', 'wwe', 'boxing', ' f1', 'formula 1', 'motogp', 'golf', 'tennis', 'rugby', 'cricket', 'darts', 'pdc', 'la liga', 'premier league', 'champions league', 'world cup', 'league one', 'league two', 'championship', 'ssc', 'bundesliga', 'uefa', 'fifa'];
    if (sportsKw.some(k => all.includes(k))) return 'sports';

    // Streaming services / premium brand groups
    if (info?.isStreamingService) return 'streaming';
    const streamingKw = ['netflix', 'disney', ' hbo', 'hbo ', ' max', 'apple tv', 'hulu', 'paramount', 'peacock', 'starz', 'showtime', 'prime video', 'amazon', 'shahid', 'mbc', 'osn', 'rotana', 'jawwy', 'tod', 'starzplay', 'sky cinema', 'sky entertainment', 'sky atlantic', 'sky one', 'pluto', 'tubi', 'fubo', 'crave', 'stan', 'binge'];
    if (streamingKw.some(k => all.includes(k))) return 'streaming';

    // Arabic — countries, Arabic script, or known Arabic networks
    const arabicCountries = ['egypt', 'saudi arabia', 'uae', 'qatar', 'kuwait', 'bahrain', 'oman', 'jordan', 'lebanon', 'iraq', 'palestine', 'morocco', 'tunisia', 'algeria', 'libya', 'sudan', 'syria', 'yemen', 'arabic', 'arab', 'gulf'];
    if (info && arabicCountries.includes(info.name.toLowerCase())) return 'arabic';
    if (arabicCountries.some(k => all.includes(k))) return 'arabic';
    if (/[\u0600-\u06FF]/.test(group.displayName)) return 'arabic';
    if (/(al[\s-]?jazeera|al[\s-]?arabiya|al[\s-]?hadath|al[\s-]?mayadeen|abu dhabi|dubai|dmc|cbc|nahar)/i.test(all)) return 'arabic';

    // English-speaking countries + English networks
    const englishCountries = ['united states', 'usa', 'united kingdom', 'uk', 'canada', 'australia', 'ireland', 'new zealand'];
    if (info && englishCountries.includes(info.name.toLowerCase())) return 'english';
    if (englishCountries.some(k => all.includes(k))) return 'english';
    if (/^(us_|uk_|ca_|au_|ie_|nz_|gb_)/.test(group.name)) return 'english';
    const englishNetworks = ['abc', 'cbs', 'nbc', ' fox', 'fox ', 'cnn', 'msnbc', 'bbc', 'itv', 'channel 4', 'channel 5', 'pbs', 'amc', 'tnt', 'tbs', ' fx', 'fx ', 'syfy', 'usa network', 'bravo', 'lifetime', 'hallmark', 'discovery', 'history', 'national geographic', 'animal planet', 'tlc', 'hgtv', 'food network', 'cartoon network', 'nickelodeon', 'mtv', 'vh1', 'comedy central', 'bloomberg', 'euronews', 'france 24', 'cinemax', 'a&e', 'cnbc', 'bet', 'travel channel', 'smithsonian', 'motortrend', 'oxygen', 'investigation discovery'];
    if (englishNetworks.some(k => all.includes(k))) return 'english';

    return 'other';
  }, []);

  // Group sorted groups into sections for the Live category sidebar
  const sectionedGroups = useMemo(() => {
    if (category !== 'live') return null;
    type GroupItem = (typeof groups)[number];
    const buckets: Record<LiveSection, GroupItem[]> = {
      arabic: [], english: [], streaming: [], sports: [], other: [],
    };
    for (const g of groups as GroupItem[]) {
      buckets[classifyLiveSection(g as any)].push(g);
    }
    return SECTION_ORDER
      .map(section => ({ section, label: SECTION_LABELS[section], items: buckets[section] }))
      .filter(s => s.items.length > 0);
  }, [groups, category, classifyLiveSection]);



  // Auto-select first group when groups load and no group is selected
  useEffect(() => {
    if (category === 'sports' && !selectedGroup) {
      setSelectedGroup('__match_center__');
    } else if (groups.length > 0 && (!selectedGroup || (!groups.find(g => g.name === selectedGroup) && selectedGroup !== '__match_center__'))) {
      setSelectedGroup(category === 'sports' ? '__match_center__' : groups[0].name);
    }
  }, [groups, selectedGroup, category]);

  const filteredChannels = useMemo(() => {
    const hasSearchQuery = effectiveSearchQuery.trim().length > 0;
    
    let filtered = channels.filter((channel) => {
      const matchesSearch = channel.name.toLowerCase().includes(effectiveSearchQuery.toLowerCase());
      
      // When searching, ignore group filter and search ALL channels
      let matchesGroup = hasSearchQuery || selectedGroup === 'all';
      if (!matchesGroup) {
        if (category === 'sports') {
          // Sports mode: match by smart categorization
          const chSportsGroup = sportsChannelGroupMap.get(channel.id) || 'Other';
          matchesGroup = chSportsGroup === selectedGroup;
        } else {
          const originalNames = normalizedGroupMap.get(selectedGroup) || [];
          matchesGroup = originalNames.includes(channel.group || 'Uncategorized');
        }
      }
      
      const matchesFavorites = !localShowFavoritesOnly || favorites.has(channel.id);
      return matchesSearch && matchesGroup && matchesFavorites;
    });

    switch (sortBy) {
      case 'a-z':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [channels, effectiveSearchQuery, selectedGroup, localShowFavoritesOnly, favorites, sortBy, category, sportsChannelGroupMap, normalizedGroupMap]);

  const { visibleItems: visibleChannels, onScroll, ensureIndexVisible, hasMore } = useProgressiveList(filteredChannels, { initial: 80, step: 100 });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredChannels.length === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => { const next = Math.min(prev + 1, filteredChannels.length - 1); ensureIndexVisible(next); return next; });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredChannels[focusedIndex]) onChannelSelect(filteredChannels[focusedIndex]);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredChannels, focusedIndex, onChannelSelect, ensureIndexVisible]);

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    if (isMobile) setSidebarOpen(false);
    // Reset scroll to top when changing groups
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Preview channel (hovered or current)
  const previewChannel = hoveredChannel || currentChannel;

  // Auto-fetch/generate logos for groups that have no static logo match
  useEffect(() => {
    if (groups.length === 0) return;

    const needLogos: string[] = [];
    for (const group of groups) {
      const hasStaticLogo = (() => {
        if (category === 'sports') {
          const meta = SPORTS_GROUP_META[group.name];
          if (meta?.flagUrl) return true;
          if (matchBrandLogo(group.name)) return true;
          return !!group.firstLogo;
        }
        if (matchBrandLogo(group.displayName)) return true;
        for (const origName of group.originalNames) {
          if (matchBrandLogo(origName)) return true;
        }
        const countryInfo = getCountryInfo(group.displayName);
        if (countryInfo?.flagUrl) return true;
        for (const origName of group.originalNames) {
          if (getCountryFlagUrl(origName)) return true;
        }
        return false;
      })();

      if (!hasStaticLogo && !aiGroupLogos[group.displayName] && !aiGroupLogosFetchedRef.current.has(group.displayName)) {
        needLogos.push(group.displayName);
      }
    }

    if (needLogos.length === 0) return;

    // Mark as fetched to prevent duplicate requests
    needLogos.forEach(name => aiGroupLogosFetchedRef.current.add(name));

    const fetchBatch = async (batch: string[]) => {
      try {
        const { data, error } = await supabase.functions.invoke('find-channel-logo', {
          body: {
            items: batch.map(name => ({ name, mediaType: 'channel' })),
            allowAiGeneration: true,
          },
        });
        if (!error && data?.logos) {
          const valid: Record<string, string> = {};
          for (const [name, url] of Object.entries(data.logos)) {
            if (url) valid[name] = url as string;
          }
          if (Object.keys(valid).length > 0) {
            setAiGroupLogos(prev => ({ ...prev, ...valid }));
          }
        }
      } catch (e) {
        console.error('AI group logo fetch failed:', e);
      }
    };

    // Process in batches of 8 so every visible Live TV group quickly gets a logo attempt
    const run = async () => {
      for (let i = 0; i < needLogos.length; i += 8) {
        await fetchBatch(needLogos.slice(i, i + 8));
        if (i + 8 < needLogos.length) await new Promise(r => setTimeout(r, 650));
      }
    };
    run();
  }, [groups, category]);

  // Get logo for groups - brand logos for services, country flags for countries, AI fallback
  const getGroupLogo = (group: { name: string; displayName: string; firstLogo?: string; originalNames: string[]; brandLogo?: string }): string | null => {
    const searchableGroupName = [group.name, group.displayName, ...group.originalNames].join(' ');
    if (/\bsky\s*(entertainment|one|atlantic|showcase|witness|comedy|max)\b/i.test(searchableGroupName)) {
      return SKY_ENTERTAINMENT_LOGO;
    }
    if (/\bsky\s*(documentary|documentaries|docs?)\b/i.test(searchableGroupName)) {
      return SKY_DOCUMENTARY_LOGO;
    }

    // Highest priority: explicit brand logo set by generic-name brand sniffer
    if (group.brandLogo) return group.brandLogo;
    // Sports mode: use sports-specific meta
    if (category === 'sports') {
      const meta = SPORTS_GROUP_META[group.name];
      if (meta?.flagUrl) return meta.flagUrl;
      const brandLogo = matchBrandLogo(group.name);
      if (brandLogo) return brandLogo;
      return aiGroupLogos[group.displayName] || null;
    }

    // US sub-groups: prioritize channel-derived logo over flag
    if (group.name.startsWith('us_')) return group.firstLogo || aiGroupLogos[group.displayName] || null;

    // 1. Try brand logo matching first
    const brandLogo = matchBrandLogo(group.displayName);
    if (brandLogo) return brandLogo;
    
    for (const origName of group.originalNames) {
      const origBrand = matchBrandLogo(origName);
      if (origBrand) return origBrand;
    }

    const countryInfo = getCountryInfo(group.displayName);
    
    if (countryInfo?.isStreamingService) {
      if (countryInfo.flagUrl) return countryInfo.flagUrl;
      return aiGroupLogos[group.displayName] || null;
    }
    
    // For country sub-groups (e.g., "USA Premium"), use first channel logo instead of country flag
    // Exception: "Premium" sub-groups keep the country flag
    const isMainCountryGroup = countryInfo && countryInfo.name === group.displayName;
    const isPremiumGroup = group.displayName.toLowerCase().includes('premium');
    if ((isMainCountryGroup || isPremiumGroup) && countryInfo?.flagUrl) return countryInfo.flagUrl;
    
    // For other sub-groups like "USA Entertainment", wait for the category logo resolver instead of showing random channel art
    if (countryInfo && !isMainCountryGroup) return aiGroupLogos[group.displayName] || null;
    
    for (const origName of group.originalNames) {
      const flag = getCountryFlagUrl(origName);
      if (flag) return flag;
    }
    
    // AI-resolved logo fallback
    return aiGroupLogos[group.displayName] || null;
  };

  const isGroupFlagLogo = (group: { displayName: string; originalNames: string[] }, logo: string | null): boolean => {
    if (!logo) return false;
    if (logo.includes('flagcdn.com')) return true;
    const countryInfo = getCountryInfo(group.displayName);
    if (countryInfo?.flagUrl === logo) return true;
    return group.originalNames.some(origName => getCountryFlagUrl(origName) === logo);
  };

  // Check if a group is a streaming service (for logo styling)
  const isStreamingServiceGroup = (group: { displayName: string }): boolean => {
    if (category === 'sports') {
      const meta = SPORTS_GROUP_META[group.displayName];
      return !!meta?.isService;
    }
    const countryInfo = getCountryInfo(group.displayName);
    return !!countryInfo?.isStreamingService;
  };

  return (
    <div className="h-full flex flex-col bg-background relative overflow-x-hidden">

      <div className="flex-1 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar - Country/Category List with Collapse Toggle */}
      <div 
        style={{ width: isMobile ? 256 : sidebarCollapsed ? 72 : 224 }}
        className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'flex-shrink-0 relative transition-[width] duration-200 ease-out'
          } 
          flex flex-col border-r border-border/30 bg-background
        `}
      >
        {/* Collapse toggle button - Desktop only */}
        {!isMobile && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-md hover:scale-110 active:scale-90"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}
        
        {/* Back Button & Title */}
        <div className="flex items-center gap-3 p-4">
          {isMobile ? (
            <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80 transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {(!sidebarCollapsed || isMobile) && (
            <h1 className="text-lg font-semibold text-foreground whitespace-nowrap overflow-hidden">
              {getCategoryTitle(category)}
            </h1>
          )}
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1 mi-scrollbar">
          {/* Match Center tab - Sports only */}
          {category === 'sports' && (
            <button
              onClick={() => handleGroupSelect('__match_center__')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                selectedGroup === '__match_center__'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              {(!sidebarCollapsed || isMobile) && (
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm truncate ${selectedGroup === '__match_center__' ? 'font-semibold' : ''}`}>
                    Match Center
                  </p>
                  {selectedGroup === '__match_center__' && (
                    <p className="text-xs text-muted-foreground">Scores & Schedule</p>
                  )}
                </div>
              )}
            </button>
          )}

          {(() => {
            const renderGroupButton = (group: typeof groups[number]) => {
              const groupLogo = getGroupLogo(group);
              const isFlagLogo = isGroupFlagLogo(group, groupLogo);
              const isFillLogo = !!groupLogo && /round-logo|mbc-(group-)?logo|mbc-logo|alwan|us-lat-logo|us-victory|sky-entertainment-logo/i.test(groupLogo);
              return (
                <button
                  key={`${group.name}-${groupLogo ?? 'none'}`}
                  onClick={() => handleGroupSelect(group.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    selectedGroup === group.name
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-muted relative">
                    {groupLogo ? (
                      <img
                        src={groupLogo}
                        alt={group.displayName}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 z-10 w-full h-full object-cover bg-muted"
                        onError={(event) => {

                          event.currentTarget.style.display = 'none';
                          event.currentTarget.parentElement?.classList.add('category-logo-failed');
                        }}
                      />
                    ) : (
                      <CategoryLogoFallback name={group.displayName} />
                    )}
                    {groupLogo && <CategoryLogoFallback name={group.displayName} />}
                  </div>
                  {(!sidebarCollapsed || isMobile) && (
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm truncate ${selectedGroup === group.name ? 'font-semibold' : ''}`}>
                        {translateGroupName(group.displayName)}
                      </p>
                    </div>
                  )}
                </button>
              );
            };

            if (sectionedGroups) {
              return sectionedGroups.map(({ section, label, items }) => (
                <div key={section} className="space-y-1">
                  {(!sidebarCollapsed || isMobile) ? (
                    <div className="pt-3 pb-1 px-3 text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70">
                      {label}
                    </div>
                  ) : (
                    <div className="pt-3 pb-1 mx-3 border-t border-border/40" />
                  )}
                  {items.map(renderGroupButton)}
                </div>
              ));
            }

            return groups.map(renderGroupButton);
          })()}

        </div>

        {/* Bottom Nav - Favorites Filter */}
        <div className="p-3 flex flex-col gap-2">
          <button
            onClick={() => setLocalShowFavoritesOnly(!localShowFavoritesOnly)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              localShowFavoritesOnly ? 'bg-accent text-white ring-2 ring-accent/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={localShowFavoritesOnly ? 'Show All Channels' : 'Show Favorites Only'}
          >
            <Heart className={`w-5 h-5 ${localShowFavoritesOnly ? 'fill-white text-white' : ''}`} />
          </button>
        </div>
      </div>

      {/* Center - Channel List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 gap-2">
          {isMobile && (
            <div className="flex items-center gap-2">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 bg-card border-border/30 rounded-xl h-10">
                <SelectValue placeholder="Order By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Order By Number</SelectItem>
                <SelectItem value="a-z">Order By A-Z</SelectItem>
                <SelectItem value="z-a">Order By Z-A</SelectItem>
              </SelectContent>
            </Select>
            
          </div>

          {/* Time & Weather */}
          {!isMobile && (
            <div className="flex items-center gap-4">
              <span className="text-foreground font-medium">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Search & Profile */}
          <div className="flex items-center gap-2">
            {showSearchInput ? (
              <div className="relative flex items-center gap-1">
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  onBlur={() => { if (!localSearchQuery) setShowSearchInput(false); }}
                  className="w-40 px-4 py-2 bg-card border border-border/30 rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={toggleVoiceSearch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-card hover:bg-card/80 text-muted-foreground'}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                {localSearchQuery && (
                  <button onClick={() => { setLocalSearchQuery(''); setShowSearchInput(false); }} className="absolute right-11 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => setShowSearchInput(true)} className="w-10 h-10 rounded-full bg-card border border-border/30 flex items-center justify-center hover:bg-card/80">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={toggleVoiceSearch}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border border-border/30 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-card hover:bg-card/80 text-muted-foreground'}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            )}
            {!isMobile && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/30">
                <span className="text-white font-bold">A</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-2 mi-scrollbar" onScroll={onScroll}>
          {/* Match Center view (sports only) */}
          {category === 'sports' && selectedGroup === '__match_center__' ? (
            <LiveMatchesTicker sportsChannels={channels} onChannelSelect={onChannelSelect} />
          ) : (
            <>
              {visibleChannels.map((channel, index) => (
                <LivePreviewChannelTile
                  key={channel.id}
                  channel={channel}
                  isActive={currentChannel?.id === channel.id}
                  isFocused={focusedIndex === index}
                  isFavorite={favorites.has(channel.id)}
                  resolvedLogo={getLogoForChannel(channel.name, channel.logo)}
                  onClick={() => onChannelSelect(channel)}
                  onToggleFavorite={() => onToggleFavorite(channel.id)}
                  onHover={setHoveredChannel}
                />
              ))}

              {hasMore && <div className="py-4 text-center text-muted-foreground text-sm">Loading more…</div>}
              
              {filteredChannels.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className="text-muted-foreground text-lg">No channels found</p>
                  <p className="text-muted-foreground/60 text-sm mt-2">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      </div>
    </div>
  );
};
