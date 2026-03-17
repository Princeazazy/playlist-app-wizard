import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Star,
  ChevronLeft,
  RotateCcw,
  Rewind,
  FastForward,
  Subtitles,
  X,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/hooks/useIPTV';
import { useWeather } from '@/hooks/useWeather';
import { useWatchProgress, saveLastPlayed } from '@/hooks/useWatchProgress';
import { isNativeOrWebView } from '@/lib/platformDetect';
import { useResilientPlayback } from '@/hooks/useResilientPlayback';
import { EPGGuide } from './EPGGuide';
import { WeatherIcon } from './shared/WeatherIcon';

interface MiFullscreenPlayerProps {
  channel: Channel;
  isFavorite: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onToggleFavorite: () => void;
  allChannels?: Channel[]; // For channel carousel
  onSelectChannel?: (channel: Channel) => void; // For carousel selection
  // Series episode navigation
  onNextEpisode?: () => void;
  onPreviousEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPreviousEpisode?: boolean;
}

export const MiFullscreenPlayer = ({
  channel,
  isFavorite,
  onClose,
  onNext,
  onPrevious,
  onToggleFavorite,
  allChannels = [],
  onSelectChannel,
  onNextEpisode,
  onPreviousEpisode,
  hasNextEpisode = false,
  hasPreviousEpisode = false,
}: MiFullscreenPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);

  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [time, setTime] = useState(new Date());
  const weather = useWeather();
  const [error, setError] = useState<string | null>(null);

  // VOD-specific states
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const lastSaveTimeRef = useRef(0);
  
  // Subtitle track states
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; lang: string; url?: string }[]>([]);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState(-1);
  const [showSubtitlePicker, setShowSubtitlePicker] = useState(false);
  const subtitlesFetchedRef = useRef(false);
  
  // Thumbnail preview scrubbing states
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastPreviewSeekRef = useRef(0);

  // Now Playing banner state
  const [showNowPlaying, setShowNowPlaying] = useState(true);
  const [showEPGOverlay, setShowEPGOverlay] = useState(false);
  const nowPlayingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVOD = channel.group?.toLowerCase().includes('movie') ||
    channel.group?.toLowerCase().includes('series') ||
    channel.group?.toLowerCase().includes('vod') ||
    channel.url?.includes('/movie/') ||
    channel.url?.includes('/series/');

  const isSeries = channel.group?.toLowerCase().includes('series') ||
    channel.url?.includes('/series/') ||
    channel.type === 'series';

  const isMovie = channel.group?.toLowerCase().includes('movie') ||
    channel.url?.includes('/movie/') ||
    channel.type === 'movies';

  // Skip 10 seconds forward/backward (hlsRef accessed at call time, defined later)
  const hlsRefLocal = useRef<any>(null);
  const handleSkipForward = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const target = Math.min(video.currentTime + 10, video.duration || video.currentTime + 10);
      video.currentTime = target;
      if (hlsRefLocal.current) hlsRefLocal.current.startLoad(target);
    }
  }, []);

  const handleSkipBackward = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      const target = Math.max(video.currentTime - 10, 0);
      video.currentTime = target;
      if (hlsRefLocal.current) hlsRefLocal.current.startLoad(target);
    }
  }, []);

  const { savedPosition, hasSavedProgress, saveProgress, saveInterval } = useWatchProgress(
    channel.id,
    channel.name,
    channel.logo,
    channel.url,
    channel.group
  );

  useEffect(() => {
    if (!channel.url) return;
    saveLastPlayed({
      channelId: channel.id,
      channelName: channel.name,
      url: channel.url,
      logo: channel.logo,
      type: channel.type,
      group: channel.group,
    });
  }, [channel.id, channel.url]);

  const functionConfig = useMemo(() => {
    const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
    const functionsBase = supabaseUrl ? new URL('functions/v1/', supabaseUrl).toString() : '';
    const streamProxyUrl = functionsBase ? new URL('stream-proxy', functionsBase).toString() : '';
    return { streamProxyUrl };
  }, []);

  const applyHlsSubtitleTracks = useCallback((hlsInstance: Hls) => {
    if (!hlsInstance.subtitleTracks || hlsInstance.subtitleTracks.length === 0) return;

    const tracks = hlsInstance.subtitleTracks.map((track, index) => ({
      id: index,
      name: track.name || track.lang || `Track ${index + 1}`,
      lang: track.lang || '',
    }));

    setSubtitleTracks(tracks);
    setActiveSubtitleTrack(hlsInstance.subtitleTrack);
  }, []);

  const {
    hlsRef,
    playbackState,
    error: playbackError,
    retryCount,
    retryPlayback,
    activeSource,
  } = useResilientPlayback({
    videoRef,
    channel,
    isVOD,
    forceMuted: false,
    maxReconnectCycles: isVOD ? 1 : 2,
    startupTimeoutMs: isVOD ? 10000 : 8000,
    stalledThresholdMs: isVOD ? 15000 : 12000,
    logPrefix: 'FullscreenPlayer',
    onManifestParsed: applyHlsSubtitleTracks,
    onSubtitleTracksUpdated: applyHlsSubtitleTracks,
  });

  // Keep local ref in sync for skip handlers defined before hlsRef
  hlsRefLocal.current = hlsRef.current;

  useEffect(() => {
      setError(playbackError);
      setIsPlaying(false);
      return;
    }

    if (playbackState === 'playing') {
      setIsPlaying(true);
      setError(null);
      return;
    }

    if (playbackState === 'connecting' || playbackState === 'buffering' || playbackState === 'reconnecting') {
      // Clear stale fatal message while recovery is in progress so Retry feels responsive.
      setError(null);
      setIsPlaying(false);
      return;
    }

    if (playbackState === 'failed') {
      setIsPlaying(false);
    }
  }, [playbackError, playbackState]);

  useEffect(() => {
    subtitlesFetchedRef.current = false;
    setSubtitleTracks([]);
    setActiveSubtitleTrack(-1);
  }, [channel.id]);

  // Fetch external subtitle tracks from Xtream API for VOD content
  useEffect(() => {
    if (!channel.url || !isVOD || subtitlesFetchedRef.current) return;
    
    // Check if URL looks like an Xtream API movie/series URL
    const isXtreamUrl = /\/(movie|series)\/[^\/]+\/[^\/]+\/\d+/.test(channel.url);
    if (!isXtreamUrl) return;
    
    subtitlesFetchedRef.current = true;
    
    const fetchSubs = async () => {
      try {
        console.log('[Player] Fetching VOD subtitle info...');
        const { data, error: fetchError } = await supabase.functions.invoke('fetch-vod-info', {
          body: { streamUrl: channel.url },
        });
        
        if (fetchError) {
          console.warn('[Player] Subtitle fetch error:', fetchError);
          return;
        }
        
        if (data?.subtitles && data.subtitles.length > 0) {
          console.log(`[Player] Found ${data.subtitles.length} external subtitle tracks`);
          const video = videoRef.current;
          
          const tracks = data.subtitles.map((sub: any, idx: number) => ({
            id: idx,
            name: sub.label || sub.language || `Subtitle ${idx + 1}`,
            lang: sub.language || '',
            url: sub.url,
          }));
          
          setSubtitleTracks(prev => prev.length > 0 ? prev : tracks);
          
          // Add <track> elements to the video for each external subtitle
          if (video) {
            data.subtitles.forEach((sub: any, idx: number) => {
              const track = document.createElement('track');
              track.kind = 'subtitles';
              track.label = sub.label || sub.language || `Subtitle ${idx + 1}`;
              track.srclang = sub.language || 'und';
              // Proxy the subtitle URL through our stream-proxy to handle CORS
              const proxyUrl = functionConfig.streamProxyUrl 
                ? `${functionConfig.streamProxyUrl}?url=${encodeURIComponent(sub.url)}`
                : sub.url;
              track.src = proxyUrl;
              track.default = false;
              video.appendChild(track);
            });
          }
        } else {
          console.log('[Player] No external subtitle tracks found from provider');
        }
      } catch (e) {
        console.warn('[Player] Subtitle fetch failed:', e);
      }
    };
    
    fetchSubs();
  }, [channel.url, isVOD, functionConfig.streamProxyUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => { setIsPlaying(true); setError(null); };
    const onPause = () => setIsPlaying(false);

    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const t = video.currentTime || 0;
      const hours = Math.floor(t / 3600);
      const minutes = Math.floor((t % 3600) / 60);
      const seconds = Math.floor(t % 60);
      setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

      const d = video.duration;
      const finiteDuration = !!d && Number.isFinite(d);

      if (finiteDuration) {
        setProgress((t / d) * 100);
        setDuration(d);
      }

      if (t - lastSaveTimeRef.current >= saveInterval) {
        // VOD: some IPTV VOD streams do not expose a finite duration (HLS live-like playlists)
        // Still save position (duration=0) so Catch Up/Resume works.
        if (isVOD) {
          saveProgress(t, finiteDuration ? d : 0);
          lastSaveTimeRef.current = t;
          return;
        }

        // Live: save with duration 0 so it appears in Catch Up even without VOD duration.
        saveProgress(t, 0);
        lastSaveTimeRef.current = t;
      }
    };

    video.addEventListener('timeupdate', updateTime);
    return () => {
      video.removeEventListener('timeupdate', updateTime);

      // Final save on exit/unmount (covers cases where user watched < saveInterval seconds)
      const t = video.currentTime || 0;
      const d = video.duration;
      const finiteDuration = !!d && Number.isFinite(d);

      if (t > 0.5) {
        if (isVOD) saveProgress(t, finiteDuration ? d : 0);
        else saveProgress(t, 0);
      }
    };
  }, [isVOD, saveProgress, saveInterval]);

  // Show resume prompt only once at the very beginning before playback starts
  const resumeCheckedRef = useRef(false);
  useEffect(() => {
    if (isVOD && hasSavedProgress && !hasResumed && !resumeCheckedRef.current) {
      resumeCheckedRef.current = true;
      setShowResumePrompt(true);
      // Pause immediately so the movie doesn't play behind the prompt
      const video = videoRef.current;
      if (video) video.pause();
    }
  }, [isVOD, hasSavedProgress, hasResumed]);

  // Now Playing banner: show for 5 seconds on channel load, then fade out
  useEffect(() => {
    setShowNowPlaying(true);
    if (nowPlayingTimerRef.current) clearTimeout(nowPlayingTimerRef.current);
    nowPlayingTimerRef.current = setTimeout(() => setShowNowPlaying(false), 5000);
    return () => { if (nowPlayingTimerRef.current) clearTimeout(nowPlayingTimerRef.current); };
  }, [channel.id]);

  // Generate a mock "currently playing" program name for the channel
  const currentProgram = useMemo(() => {
    const hour = new Date().getHours();
    const programsByTime: Record<number, string> = {
      0: 'Late Night Cinema', 1: 'Night Owl Show', 2: 'Midnight Classics',
      3: 'Night Replay', 4: 'Early Bird News', 5: 'Morning Prayers',
      6: 'Sunrise News', 7: 'Breakfast Show', 8: 'Morning Talk',
      9: 'Daily Magazine', 10: 'Morning Movie', 11: 'Lifestyle Hour',
      12: 'Midday News', 13: 'Afternoon Drama', 14: 'Documentary Hour',
      15: 'Afternoon Show', 16: 'Kids Time', 17: 'Evening Magazine',
      18: 'Evening News', 19: 'Prime Time Show', 20: 'Prime Time Movie',
      21: 'Drama Series', 22: 'Late Show', 23: 'Night News',
    };
    return programsByTime[hour] || 'Live Broadcast';
  }, [channel.id]);

  const handleResume = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (savedPosition > 0) video.currentTime = savedPosition;
      video.play().catch(() => {});
    }
    setShowResumePrompt(false);
    setHasResumed(true);
  }, [savedPosition]);

  const handleStartOver = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    setShowResumePrompt(false);
    setHasResumed(true);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * duration;
    
    // For HLS streams, we need to ensure the correct segment is loaded
    const hls = hlsRef.current;
    if (hls) {
      // Stop current loading, seek, then restart loading from new position
      video.currentTime = targetTime;
      hls.startLoad(targetTime);
    } else {
      video.currentTime = targetTime;
    }
    setProgress(percentage * 100);
  };

  // Initialize hidden preview video when source is available
  useEffect(() => {
    const mainVideo = videoRef.current;
    if (!mainVideo || !isVOD || !activeSource) return;

    // Create a hidden video element for thumbnail generation
    const pv = document.createElement('video');
    pv.preload = 'metadata';
    pv.muted = true;
    pv.playsInline = true;
    pv.style.display = 'none';
    pv.src = activeSource;
    document.body.appendChild(pv);
    previewVideoRef.current = pv;

    const onSeeked = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas || pv.videoWidth === 0) return;
      try {
        canvas.width = 240;
        canvas.height = 135;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(pv, 0, 0, 240, 135);
          setPreviewImage(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch {
        setPreviewImage(null);
      }
    };
    pv.addEventListener('seeked', onSeeked);

    return () => {
      pv.removeEventListener('seeked', onSeeked);
      pv.remove();
      previewVideoRef.current = null;
    };
  }, [activeSource, isVOD]);

  // Generate preview thumbnail when hovering over progress bar
  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
    const time = percentage * duration;

    setHoverTime(time);
    setHoverPosition(hoverX);
    setShowPreview(true);

    // Throttle seeks to prevent overwhelming the preview video
    const now = Date.now();
    if (now - lastPreviewSeekRef.current < 200) return;
    lastPreviewSeekRef.current = now;

    const pv = previewVideoRef.current;
    if (pv && pv.readyState >= 1) {
      pv.currentTime = time;
    }
  }, [duration]);

  const handleProgressLeave = useCallback(() => {
    setShowPreview(false);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);
    handleMouseMove();

    return () => {
      container?.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSubtitle = useCallback((trackId: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = trackId;
      setActiveSubtitleTrack(trackId);
    }
    // Also handle native text tracks
    const video = videoRef.current;
    if (video?.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === trackId ? 'showing' : 'hidden';
      }
    }
    setShowSubtitlePicker(false);
  }, []);

  const handleDisableSubtitles = useCallback(() => {
    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = -1;
      setActiveSubtitleTrack(-1);
    }
    const video = videoRef.current;
    if (video?.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'hidden';
      }
    }
    setShowSubtitlePicker(false);
  }, []);

  // Also detect native video text tracks (for non-HLS sources)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const checkTracks = () => {
      if (subtitleTracks.length > 0) return; // HLS already provided them
      const tracks: { id: number; name: string; lang: string }[] = [];
      for (let i = 0; i < video.textTracks.length; i++) {
        const t = video.textTracks[i];
        if (t.kind === 'subtitles' || t.kind === 'captions') {
          tracks.push({ id: i, name: t.label || t.language || `Track ${i + 1}`, lang: t.language || '' });
        }
      }
      if (tracks.length > 0) setSubtitleTracks(tracks);
    };
    video.textTracks.addEventListener('addtrack', checkTracks);
    checkTracks();
    return () => video.textTracks.removeEventListener('addtrack', checkTracks);
  }, [subtitleTracks.length]);

  const isMultiSub = channel.name?.toLowerCase().includes('multi sub') || 
                     channel.name?.toLowerCase().includes('multi lang') ||
                     channel.group?.toLowerCase().includes('multi') ||
                     subtitleTracks.length > 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playbackState === 'failed') {
      retryPlayback();
      return;
    }

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    video.play().then(() => {
      setIsPlaying(true);
      setError(null);
    }).catch((e) => {
      setIsPlaying(false);
      if (e?.name === 'NotAllowedError') setError('Autoplay was blocked — tap Play to start.');
      else setError('Playback failed.');
    });
  };

  const playbackStatusText = (() => {
    if (playbackState === 'connecting') return 'Connecting';
    if (playbackState === 'buffering') return 'Buffering';
    if (playbackState === 'reconnecting') return `Reconnecting${retryCount > 0 ? ` (${retryCount})` : ''}`;
    if (playbackState === 'failed') return 'Failed to play';
    return 'Live';
  })();

  const playbackStatusClass = (() => {
    if (playbackState === 'failed') return 'bg-destructive/85 text-destructive-foreground';
    if (playbackState === 'reconnecting') return 'bg-primary/85 text-primary-foreground';
    if (playbackState === 'buffering') return 'bg-accent/85 text-accent-foreground';
    if (playbackState === 'connecting') return 'bg-muted/85 text-foreground';
    return 'bg-primary text-primary-foreground';
  })();

  return (
    <div
      ref={containerRef}
      onClick={() => {
        const v = videoRef.current;
        if (v?.paused) v.play().catch(() => { });
      }}
      className="fixed inset-0 z-50 bg-black cursor-pointer"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted
        crossOrigin="anonymous"
      />

      {(playbackState === 'connecting' || playbackState === 'buffering' || playbackState === 'reconnecting') && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-black/55 backdrop-blur-sm text-white text-sm font-medium">
            {playbackStatusText}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10" onClick={(e) => e.stopPropagation()}>
          <div className="text-center max-w-md px-6">
            <p className="text-white text-lg mb-3">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryPlayback();
                }}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                Retry Stream
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Prompt */}
      {showResumePrompt && isVOD && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10" onClick={(e) => e.stopPropagation()}>
          <div className="text-center max-w-md px-6">
            <RotateCcw className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Resume Watching?</h3>
            <p className="text-white/70 mb-6">You were at {formatTime(savedPosition)}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={(e) => { e.stopPropagation(); handleStartOver(); }} className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20">Start Over</button>
              <button onClick={(e) => { e.stopPropagation(); handleResume(); }} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Resume</button>
            </div>
          </div>
        </div>
      )}

      {/* Now Playing Banner - auto-dismisses after 5 seconds */}
      {!isVOD && showNowPlaying && !error && (
        <div 
          className="absolute top-20 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-4 duration-500"
          style={{ animation: showNowPlaying ? 'fadeSlideIn 0.5s ease-out' : 'fadeSlideOut 0.5s ease-in forwards' }}
        >
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 px-8 py-5 min-w-[320px] max-w-[500px] shadow-2xl">
            <div className="flex items-center gap-4">
              {/* Live pulse */}
              <div className="relative flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Now Playing</p>
                <h3 className="text-white text-lg font-bold truncate">{channel.name}</h3>
                <p className="text-primary text-sm font-medium mt-0.5">{currentProgram}</p>
                <p className="text-white/40 text-xs mt-1">{channel.group || 'Live TV'}</p>
              </div>
              {channel.logo && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                  <img src={channel.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EPG Guide Overlay */}
      {showEPGOverlay && (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm overflow-auto" onClick={(e) => e.stopPropagation()}>
          <EPGGuide
            channels={allChannels.length > 0 ? allChannels : [channel]}
            currentChannel={channel}
            onChannelSelect={(ch) => {
              setShowEPGOverlay(false);
              onSelectChannel?.(ch);
            }}
            onClose={() => setShowEPGOverlay(false)}
          />
        </div>
      )}

      {/* Controls Overlay - Mi Player Pro Style */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Top Left - Channel Logo */}
        <div className="absolute top-6 left-6">
          {channel.logo ? (
            <div className="w-16 h-12 rounded flex items-center justify-center overflow-hidden">
              <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          ) : (
            <div className="w-16 h-12 rounded border-2 border-accent flex items-center justify-center bg-black/30">
              <span className="text-accent font-bold text-xl">{channel.name.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Top Right - Status, Time, Weather & Subtitle Toggle */}
        <div className="absolute top-6 right-6 flex items-center gap-4 text-white/80">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${playbackStatusClass}`}>
            {playbackStatusText}
          </span>

          {/* Subtitle button */}
          {(isMultiSub || subtitleTracks.length > 0) && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowSubtitlePicker(prev => !prev); }}
              className={`p-2 rounded-full transition-colors ${activeSubtitleTrack >= 0 ? 'bg-primary text-primary-foreground' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              title="Subtitles"
            >
              <Subtitles className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              retryPlayback();
            }}
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            title="Reload stream"
          >
            Reload
          </button>

          <span className="text-lg font-medium">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1">
            <WeatherIcon icon={weather.icon} />
            <span>{weather.displayTemp}</span>
          </div>
        </div>

        {/* Subtitle Language Picker Panel */}
        {showSubtitlePicker && (
          <div 
            className="absolute top-20 right-6 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4 z-20 min-w-[220px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Subtitles className="w-4 h-4" />
                Subtitles
              </h3>
              <button onClick={() => setShowSubtitlePicker(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {subtitleTracks.length > 0 ? (
              <div className="space-y-1">
                {/* Off option */}
                <button
                  onClick={() => handleDisableSubtitles()}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSubtitleTrack === -1 ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10'}`}
                >
                  Off
                </button>
                {subtitleTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectSubtitle(track.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeSubtitleTrack === track.id ? 'bg-primary text-primary-foreground' : 'text-white/80 hover:bg-white/10'}`}
                  >
                    {track.name}
                    {track.lang && track.lang !== track.name && (
                      <span className="text-white/40 ml-2 text-xs uppercase">({track.lang})</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">No subtitle tracks detected in this stream. The provider may embed subtitles directly in the video.</p>
            )}
          </div>
        )}

        {/* Top Left - Channel Info (small card) */}
        <div className="absolute top-6 left-20 flex items-center gap-3">
          <button onClick={onToggleFavorite} className="p-1">
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-accent text-accent' : 'text-white/60 hover:text-white'}`} />
          </button>

          {!isVOD && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded">Live</span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowEPGOverlay(true); }}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium rounded flex items-center gap-1 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                TV Guide
              </button>
            </div>
          )}

          <h1 className="text-white text-sm font-semibold truncate max-w-[280px]">{channel.name}</h1>
          <span className="text-white/50 text-xs">{channel.group || 'Live TV'}</span>
        </div>

        {/* Bottom Left - Elapsed Time */}
        <div className="absolute bottom-8 left-6">
          <p className="text-white/50 text-2xl font-light">{currentTime}</p>
          {isVOD && duration > 0 && (
            <p className="text-white/40 text-lg">{formatTime(duration)}</p>
          )}
        </div>

        {/* VOD Progress Bar with Thumbnail Preview */}
        {isVOD && duration > 0 && (
          <div className="absolute bottom-32 left-6 right-6">
            {/* Hidden canvas for generating thumbnails */}
            <canvas ref={previewCanvasRef} className="hidden" />
            
            {/* Thumbnail Preview */}
            {showPreview && (
              <div 
                className="absolute bottom-8 -translate-x-1/2 pointer-events-none transition-opacity duration-150"
                style={{ left: hoverPosition }}
              >
                <div className="bg-black/90 rounded-lg p-1 shadow-2xl border border-white/20">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-60 h-[135px] object-cover rounded" />
                  ) : (
                    <div className="w-60 h-[135px] bg-card/80 rounded flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Preview</span>
                    </div>
                  )}
                  <div className="text-center mt-1">
                    <span className="text-white text-sm font-medium">{formatTime(hoverTime)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Bar */}
            <div 
              className="h-2 bg-white/20 rounded-full cursor-pointer group relative"
              onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
              onMouseMove={handleProgressHover}
              onMouseLeave={handleProgressLeave}
            >
              {/* Buffered indicator */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className="h-full bg-white/10 rounded-full" style={{ width: '60%' }} />
              </div>
              
              {/* Progress */}
              <div className="h-full bg-primary rounded-full transition-all relative z-10" style={{ width: `${progress}%` }}>
                {/* Scrub handle */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Hover position indicator */}
              {showPreview && (
                <div 
                  className="absolute top-0 h-full w-0.5 bg-white/60 pointer-events-none"
                  style={{ left: hoverPosition }}
                />
              )}
            </div>
            
            {/* Time labels */}
            <div className="flex justify-between mt-2">
              <span className="text-white/60 text-sm">{formatTime(progress / 100 * duration)}</span>
              <span className="text-white/60 text-sm">{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Center Controls */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6 bottom-8">
          {/* Live TV: Previous/Next channel */}
          {!isVOD && (
            <button onClick={(e) => { e.stopPropagation(); onPrevious?.(); }} className="p-3 rounded-full hover:bg-white/10 transition-colors">
              <SkipBack className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Series: Previous Episode */}
          {isSeries && hasPreviousEpisode && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPreviousEpisode?.(); }} 
              className="p-3 rounded-full hover:bg-white/10 transition-colors flex flex-col items-center"
              title="Previous Episode"
            >
              <SkipBack className="w-6 h-6 text-white" />
              <span className="text-white/70 text-[10px] mt-0.5">Prev Ep</span>
            </button>
          )}

          {/* VOD: Skip backward 10s */}
          {isVOD && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleSkipBackward(); }} 
              className="p-3 rounded-full hover:bg-white/10 transition-colors flex flex-col items-center"
              title="Rewind 10s"
            >
              <Rewind className="w-7 h-7 text-white" />
              <span className="text-white/70 text-[10px] mt-0.5">10s</span>
            </button>
          )}

          {/* Play/Pause - VOD only */}
          {isVOD && (
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm transition-colors">
              {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
            </button>
          )}

          {/* VOD: Skip forward 10s */}
          {isVOD && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleSkipForward(); }} 
              className="p-3 rounded-full hover:bg-white/10 transition-colors flex flex-col items-center"
              title="Forward 10s"
            >
              <FastForward className="w-7 h-7 text-white" />
              <span className="text-white/70 text-[10px] mt-0.5">10s</span>
            </button>
          )}

          {/* Series: Next Episode */}
          {isSeries && hasNextEpisode && (
            <button 
              onClick={(e) => { e.stopPropagation(); onNextEpisode?.(); }} 
              className="p-3 rounded-full hover:bg-white/10 transition-colors flex flex-col items-center"
              title="Next Episode"
            >
              <SkipForward className="w-6 h-6 text-white" />
              <span className="text-white/70 text-[10px] mt-0.5">Next Ep</span>
            </button>
          )}

          {/* Live TV: Next channel */}
          {!isVOD && (
            <button onClick={(e) => { e.stopPropagation(); onNext?.(); }} className="p-3 rounded-full hover:bg-white/10 transition-colors">
              <SkipForward className="w-8 h-8 text-white" />
            </button>
          )}
        </div>

        {/* Back Button - Bottom right corner */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute bottom-8 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
          <span className="text-white font-medium">Back</span>
        </button>
      </div>
    </div>
  );
};
