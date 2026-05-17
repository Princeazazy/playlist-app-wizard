import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X, Mic, MicOff, Tv, Film, Clapperboard } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
  onItemSelect: (item: Channel) => void;
  initialQuery?: string;
}

export const GlobalSearchModal = ({
  isOpen,
  onClose,
  channels,
  onChannelSelect,
  onItemSelect,
  initialQuery,
}: GlobalSearchModalProps) => {
  const [query, setQuery] = useState(initialQuery ?? '');

  useEffect(() => {
    if (isOpen && initialQuery !== undefined) setQuery(initialQuery);
  }, [isOpen, initialQuery]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          setQuery(transcript);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        recognitionInstance.onerror = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const toggleVoiceSearch = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, isListening]);

  // Filter channels by search query
  const searchResults = useMemo(() => {
    if (!query.trim()) return { live: [], movies: [], series: [] };

    const lowerQuery = query.toLowerCase();

    const live = channels.filter(
      (ch) =>
        (ch.type === 'live' || ch.type === 'sports' || !ch.type) &&
        (ch.name.toLowerCase().includes(lowerQuery) ||
          ch.group?.toLowerCase().includes(lowerQuery))
    );

    const movies = channels.filter(
      (ch) =>
        ch.type === 'movies' &&
        (ch.name.toLowerCase().includes(lowerQuery) ||
          ch.group?.toLowerCase().includes(lowerQuery) ||
          ch.genre?.toLowerCase().includes(lowerQuery))
    );

    const series = channels.filter(
      (ch) =>
        ch.type === 'series' &&
        (ch.name.toLowerCase().includes(lowerQuery) ||
          ch.group?.toLowerCase().includes(lowerQuery) ||
          ch.genre?.toLowerCase().includes(lowerQuery))
    );

    return { live: live.slice(0, 10), movies: movies.slice(0, 10), series: series.slice(0, 10) };
  }, [query, channels]);

  const hasResults =
    searchResults.live.length > 0 ||
    searchResults.movies.length > 0 ||
    searchResults.series.length > 0;

  const handleSelect = (channel: Channel) => {
    if (channel.type === 'movies' || channel.type === 'series') {
      onItemSelect(channel);
    } else {
      onChannelSelect(channel);
    }
    setQuery('');
    onClose();
  };

  // Reset query when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      if (isListening && recognition) {
        recognition.stop();
        setIsListening(false);
      }
    }
  }, [isOpen, isListening, recognition]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 bg-card/95 backdrop-blur-xl border-border overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 pr-12 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Live, Movies, Series..."
            className="flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            onClick={toggleVoiceSearch}
            className={`p-2 rounded-full transition-colors ${
              isListening
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() && !hasResults && (
            <div className="p-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {/* Live Results */}
          {searchResults.live.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tv className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Live ({searchResults.live.length})
                </h3>
              </div>
              <div className="space-y-1">
                {searchResults.live.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelect(channel)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-secondary"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Tv className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{channel.name}</p>
                      {channel.group && (
                        <p className="text-sm text-muted-foreground truncate">{channel.group}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Movies Results */}
          {searchResults.movies.length > 0 && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Film className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Movies ({searchResults.movies.length})
                </h3>
              </div>
              <div className="space-y-1">
                {searchResults.movies.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => handleSelect(movie)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {movie.logo || movie.backdrop_path?.[0] ? (
                      <img
                        src={movie.backdrop_path?.[0] || movie.logo}
                        alt=""
                        className="w-12 h-16 rounded-lg object-cover bg-secondary"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-secondary flex items-center justify-center">
                        <Film className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{movie.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[movie.year, movie.genre].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Series Results */}
          {searchResults.series.length > 0 && (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Clapperboard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Series ({searchResults.series.length})
                </h3>
              </div>
              <div className="space-y-1">
                {searchResults.series.map((series) => (
                  <button
                    key={series.id}
                    onClick={() => handleSelect(series)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {series.logo || series.backdrop_path?.[0] ? (
                      <img
                        src={series.backdrop_path?.[0] || series.logo}
                        alt=""
                        className="w-12 h-16 rounded-lg object-cover bg-secondary"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-secondary flex items-center justify-center">
                        <Clapperboard className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate">{series.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[series.year, series.genre].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query.trim() && (
            <div className="p-8 text-center text-muted-foreground">
              Start typing or use voice search to find channels, movies, and series
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
