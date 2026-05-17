import { useMemo } from 'react';
import { ChevronLeft, Film, Clapperboard } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';

interface StreamingServiceResultsProps {
  serviceName: string;
  channels: Channel[];
  onBack: () => void;
  onItemSelect: (item: Channel) => void;
}

/** Map a display service name to lower-case tokens we look for inside group/genre/name. */
const SERVICE_TOKENS: Record<string, string[]> = {
  'Netflix':     ['netflix', 'nflx', 'nf '],
  'Prime Video': ['prime video', 'amazon prime', 'amzn', 'amazon'],
  'Disney+':     ['disney+', 'disney plus', 'disney'],
  'Apple TV+':   ['apple tv', 'appletv', 'atv+', 'apple+'],
  'HBO Max':     ['hbo max', 'hbomax', 'hbo', ' max '],
  'Paramount+':  ['paramount+', 'paramount plus', 'paramount', 'pmt+'],
  'Hulu':        ['hulu'],
  'Peacock':     ['peacock'],
  'Starz':       ['starz'],
  'Showtime':    ['showtime', 'sho '],
};

export const StreamingServiceResults = ({
  serviceName,
  channels,
  onBack,
  onItemSelect,
}: StreamingServiceResultsProps) => {
  const tokens = SERVICE_TOKENS[serviceName] ?? [serviceName.toLowerCase()];

  const { movies, series } = useMemo(() => {
    const m: Channel[] = [];
    const s: Channel[] = [];
    for (const ch of channels) {
      if (ch.type !== 'movies' && ch.type !== 'series') continue;
      const hay = ` ${(ch.group || '').toLowerCase()} | ${(ch.genre || '').toLowerCase()} | ${(ch.name || '').toLowerCase()} `;
      if (tokens.some((t) => hay.includes(t))) {
        if (ch.type === 'movies') m.push(ch);
        else s.push(ch);
      }
    }
    return { movies: m, series: s };
  }, [channels, tokens]);

  const total = movies.length + series.length;

  const renderTile = (item: Channel) => {
    const img = item.backdrop_path?.[0] || item.logo;
    return (
      <button
        key={item.id}
        onClick={() => onItemSelect(item)}
        className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-secondary border border-border/30 relative transition-transform duration-200 group-hover:scale-105">
          {img ? (
            <img src={img} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {item.type === 'series' ? <Clapperboard className="w-8 h-8" /> : <Film className="w-8 h-8" />}
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-foreground truncate">{item.name}</p>
        {item.year && <p className="text-xs text-muted-foreground">{item.year}</p>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{serviceName}</h1>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? 'title' : 'titles'} · {movies.length} movies · {series.length} series
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {total === 0 && (
          <div className="text-center text-muted-foreground py-20">
            No {serviceName} content found in your provider's catalog.
          </div>
        )}

        {movies.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Movies ({movies.length})
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {movies.map(renderTile)}
            </div>
          </section>
        )}

        {series.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clapperboard className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Series ({series.length})
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {series.map(renderTile)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StreamingServiceResults;
