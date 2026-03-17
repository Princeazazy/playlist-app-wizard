import React from 'react';
import { Star } from 'lucide-react';
import { useRatings, RatingData } from '@/hooks/useRatings';

interface RatingBadgeProps {
  title: string;
  year?: string;
  mediaType?: string;
  imdbId?: string;
  fallbackRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showSource?: boolean;
  className?: string;
}

const sourceLabels: Record<string, string> = {
  imdb: 'IMDb',
  elcinema: 'elCinema',
  tmdb: 'TMDB',
};

const sourceColors: Record<string, string> = {
  imdb: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
  elcinema: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
  tmdb: 'bg-sky-500/20 border-sky-500/30 text-sky-300',
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  title,
  year,
  mediaType,
  imdbId,
  fallbackRating,
  size = 'sm',
  showSource = false,
  className = '',
}) => {
  const { ratingData, isLoading } = useRatings(title, year, mediaType, imdbId);

  const rating = ratingData?.bestRating || (fallbackRating && fallbackRating > 0 ? fallbackRating.toFixed(1) : null);
  const source = ratingData?.bestSource || (fallbackRating ? 'tmdb' : null);

  if (!rating) return null;

  const numRating = parseFloat(rating);
  if (isNaN(numRating) || numRating <= 0) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const starSizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const srcColor = source ? sourceColors[source] || 'bg-black/70 text-white' : 'bg-black/70 text-white';

  return (
    <div className={`inline-flex items-center rounded ${sizeClasses[size]} backdrop-blur-sm border ${srcColor} ${className}`}>
      <Star className={`${starSizes[size]} fill-yellow-400 text-yellow-400`} />
      <span className="font-semibold text-white">{rating}</span>
      {showSource && source && (
        <span className="text-[9px] opacity-70 uppercase font-medium ml-0.5">
          {sourceLabels[source]}
        </span>
      )}
    </div>
  );
};

// Simple inline version for cards that accepts pre-fetched data
export const RatingBadgeInline: React.FC<{
  rating: string | number | null;
  source?: string | null;
  size?: 'sm' | 'md';
}> = ({ rating, source, size = 'sm' }) => {
  if (!rating) return null;
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(numRating) || numRating <= 0) return null;

  const srcColor = source ? sourceColors[source] || 'bg-black/70 text-white' : 'bg-black/70 text-white';
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-sm px-2.5 py-1 gap-1.5';
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`inline-flex items-center rounded ${sizeClasses} backdrop-blur-sm border ${srcColor}`}>
      <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
      <span className="font-semibold text-white">{typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
      {source && (
        <span className="text-[9px] opacity-70 uppercase font-medium ml-0.5">
          {sourceLabels[source] || source}
        </span>
      )}
    </div>
  );
};
