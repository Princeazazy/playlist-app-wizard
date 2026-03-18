import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { LiveMatchesTicker } from './LiveMatchesTicker';
import { ChevronLeft, ChevronRight, Search, Star, Tv, Menu, X, Play, Calendar, Heart, Loader2, Mic, MicOff, Trophy } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCountryInfo, getCountryFlagUrl, getCategoryEmoji, mergeAndSortGroups, normalizeGroupName, translateGroupName } from '@/lib/countryUtils';
import { matchBrandLogo } from '@/lib/brandLogoService';
import { EPGGuide } from './EPGGuide';
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
  const [showEPG, setShowEPG] = useState(false);
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
    // DAZN
    if (/dazn/i.test(name)) return 'DAZN';
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
    'Egypt': { flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
    'Saudi Arabia': { flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
    'UAE': { flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 3 },
    'Qatar': { flagUrl: 'https://flagcdn.com/w80/qa.png', priority: 4 },
    'Kuwait': { flagUrl: 'https://flagcdn.com/w80/kw.png', priority: 5 },
    'Bahrain': { flagUrl: 'https://flagcdn.com/w80/bh.png', priority: 6 },
    'Oman': { flagUrl: 'https://flagcdn.com/w80/om.png', priority: 7 },
    'Jordan': { flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 8 },
    'Lebanon': { flagUrl: 'https://flagcdn.com/w80/lb.png', priority: 9 },
    'Iraq': { flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 10 },
    'Palestine': { flagUrl: 'https://flagcdn.com/w80/ps.png', priority: 11 },
    'Morocco': { flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 12 },
    'Tunisia': { flagUrl: 'https://flagcdn.com/w80/tn.png', priority: 13 },
    'Algeria': { flagUrl: 'https://flagcdn.com/w80/dz.png', priority: 14 },
    'Libya': { flagUrl: 'https://flagcdn.com/w80/ly.png', priority: 15 },
    'Sudan': { flagUrl: 'https://flagcdn.com/w80/sd.png', priority: 16 },
    'Syria': { flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 17 },
    'Yemen': { flagUrl: 'https://flagcdn.com/w80/ye.png', priority: 18 },
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

      // Post-process: for US sub-groups, use the 2nd channel as the source of truth for name + logo
      const cleanUsNetworkName = (rawName: string): string | null => {
        let cleaned = rawName
          .replace(/^[#\-\s|]+/, '')
          .replace(/^(?:MYHD\s*-\s*|AM\s*\|\s*|AR\s*\|\s*|US\s*\|\s*)/i, '')
          .trim();

        const explicitMatch = cleaned.match(/\b(?:US[\s-]*)?(ABC|CBS|NBC|FOX|CW|PBS|ION|MYTV|MYTV9|TELEMUNDO|UNIVISION|UNI|TBS|TNT|AMC|A&E|FX|FXX|USA|SYFY|HBO|SHOWTIME|STARZ|DISCOVERY|HISTORY|LIFETIME|BRAVO|E!|HGTV|FOOD|TRUTV|COMEDY\s*CENTRAL|NICK|DISNEY|CARTOON\s*NETWORK)\b/i);
        if (explicitMatch) {
          const network = explicitMatch[1].toUpperCase().replace(/\s+/g, '');
          return `US-${network}`;
        }

        const prefixMatch = cleaned.match(/^(US[\s-]*[A-Z0-9&+]{2,15})\b/i);
        if (prefixMatch) {
          return prefixMatch[1].toUpperCase().replace(/\s+/g, '-');
        }

        const firstToken = cleaned.split(/\s+/)[0]?.replace(/[^A-Za-z0-9&+\-]/g, '');
        if (!firstToken || /^\d+$/.test(firstToken) || firstToken.length < 2) return null;
        return `US-${firstToken.toUpperCase()}`;
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
        }
        if (sourceChannel.logo) {
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

    // Process in batches of 5
    const run = async () => {
      for (let i = 0; i < needLogos.length; i += 5) {
        await fetchBatch(needLogos.slice(i, i + 5));
        if (i + 5 < needLogos.length) await new Promise(r => setTimeout(r, 1500));
      }
    };
    run();
  }, [groups, category]);

  // Get logo for groups - brand logos for services, country flags for countries, AI fallback
  const getGroupLogo = (group: { name: string; displayName: string; firstLogo?: string; originalNames: string[] }): string | null => {
    // Sports mode: use sports-specific meta
    if (category === 'sports') {
      const meta = SPORTS_GROUP_META[group.name];
      if (meta?.flagUrl) return meta.flagUrl;
      const brandLogo = matchBrandLogo(group.name);
      if (brandLogo) return brandLogo;
      if (group.firstLogo) return group.firstLogo;
      return aiGroupLogos[group.displayName] || null;
    }

    // US sub-groups: prioritize channel-derived logo over flag
    if (group.name.startsWith('us_') && group.firstLogo) {
      return group.firstLogo;
    }

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
      // Use first channel logo for services without a defined logo (TOD, Jawy, etc.)
      if (group.firstLogo) return group.firstLogo;
      return aiGroupLogos[group.displayName] || null;
    }
    
    // For country sub-groups (e.g., "USA Premium"), use first channel logo instead of country flag
    // Exception: "Premium" sub-groups keep the country flag
    const isMainCountryGroup = countryInfo && countryInfo.name === group.displayName;
    const isPremiumGroup = group.displayName.toLowerCase().includes('premium');
    if ((isMainCountryGroup || isPremiumGroup) && countryInfo?.flagUrl) return countryInfo.flagUrl;
    
    // For other sub-groups like "USA Entertainment", use first channel logo
    if (countryInfo && !isMainCountryGroup && group.firstLogo) return group.firstLogo;
    
    for (const origName of group.originalNames) {
      const flag = getCountryFlagUrl(origName);
      if (flag) return flag;
    }
    
    // Use first channel's logo as fallback (e.g., for US sub-groups)
    if (group.firstLogo) return group.firstLogo;
    
    // AI-resolved logo fallback
    return aiGroupLogos[group.displayName] || null;
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
      {/* EPG Guide Overlay */}
      {showEPG && (
        <div className="absolute inset-0 z-50 bg-background">
          <EPGGuide
            channels={channels}
            currentChannel={currentChannel}
            onChannelSelect={(channel) => {
              onChannelSelect(channel);
              setShowEPG(false);
            }}
            onClose={() => setShowEPG(false)}
          />
        </div>
      )}

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

          {groups.map((group) => {
            const groupLogo = getGroupLogo(group);
            const useContainedLogo = !!groupLogo && !groupLogo.includes('flagcdn.com');

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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                  groupLogo ? 'bg-muted' : 'bg-primary/10'
                }`}>
                  {groupLogo ? (
                    <img
                      src={groupLogo}
                      alt={group.displayName}
                      className="w-full h-full object-cover scale-110"
                    />
                  ) : aiGroupLogosFetchedRef.current.has(group.displayName) && !aiGroupLogos[group.displayName] ? (
                    <Tv className="w-5 h-5 text-primary/60" />
                  ) : !aiGroupLogosFetchedRef.current.has(group.displayName) ? (
                    <Loader2 className="w-5 h-5 text-primary/40 animate-spin" />
                  ) : (
                    <Tv className="w-5 h-5 text-primary/60" />
                  )}
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
          })}
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
            
            {/* EPG Button */}
            {category === 'live' && (
              <button
                onClick={() => setShowEPG(true)}
                className="flex items-center gap-2 px-4 h-10 bg-card border border-border/30 rounded-xl hover:bg-card/80 transition-colors"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground text-sm">EPG</span>
              </button>
            )}
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
