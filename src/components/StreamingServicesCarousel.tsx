import React from 'react';

interface StreamingServicesCarouselProps {
  onSelect: (serviceName: string) => void;
}

interface Service {
  name: string;
  color: string;       // brand background color
  iconSlug: string;    // simpleicons.org slug
  iconColor: string;   // hex (no #) for the icon mark
}

// Real brand colors + official monochrome marks served from cdn.simpleicons.org.
// A developer can swap iconSlug for a self-hosted asset later.
interface ServiceWithQuery extends Service {
  /** Query passed to global search — chosen to match how providers tag their groups (e.g. "Disney Plus", "Amazon", "Max"). */
  searchQuery: string;
}

const SERVICES: ServiceWithQuery[] = [
  { name: 'Netflix',     color: '#E50914', iconSlug: 'netflix',       iconColor: 'FFFFFF', searchQuery: 'Netflix' },
  { name: 'Prime Video', color: '#00A8E1', iconSlug: 'primevideo',    iconColor: 'FFFFFF', searchQuery: 'Amazon' },
  { name: 'Disney+',     color: '#0E47A1', iconSlug: 'disneyplus',    iconColor: 'FFFFFF', searchQuery: 'Disney' },
  { name: 'Apple TV+',   color: '#000000', iconSlug: 'appletv',       iconColor: 'FFFFFF', searchQuery: 'Apple TV' },
  { name: 'HBO Max',     color: '#8A2BE2', iconSlug: 'hbo',           iconColor: 'FFFFFF', searchQuery: 'HBO' },
  { name: 'Paramount+',  color: '#0064FF', iconSlug: 'paramountplus', iconColor: 'FFFFFF', searchQuery: 'Paramount' },
  { name: 'Hulu',        color: '#1CE783', iconSlug: 'hulu',          iconColor: '0B0C0F', searchQuery: 'Hulu' },
  { name: 'Peacock',     color: '#0A0A0A', iconSlug: 'peacock',       iconColor: 'FFFFFF', searchQuery: 'Peacock' },
  { name: 'Starz',       color: '#000000', iconSlug: 'starz',         iconColor: 'FFFFFF', searchQuery: 'Starz' },
  { name: 'Showtime',    color: '#CC0000', iconSlug: 'showtime',      iconColor: 'FFFFFF', searchQuery: 'Showtime' },
];

export const StreamingServicesCarousel: React.FC<StreamingServicesCarouselProps> = ({ onSelect }) => {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-lg font-semibold text-foreground">Streaming Services</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 -mx-1 px-1">
        {SERVICES.map((s) => (
          <button
            key={s.name}
            onClick={() => onSelect(s.name)}
            aria-label={s.name}
            className="flex-shrink-0 snap-start w-32 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          >
            <div
              className="aspect-[2/3] rounded-xl overflow-hidden border border-border/30 relative flex flex-col items-center justify-center gap-3 transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-1 active:scale-[0.98]"
              style={{ backgroundColor: s.color }}
            >
              <img
                src={`https://cdn.simpleicons.org/${s.iconSlug}/${s.iconColor}`}
                alt={`${s.name} logo`}
                loading="lazy"
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  // Fallback: hide the broken icon and let the text label carry the brand
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-white text-sm font-semibold tracking-wide text-center px-2 drop-shadow">
                {s.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default StreamingServicesCarousel;
