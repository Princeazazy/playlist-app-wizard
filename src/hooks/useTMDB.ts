import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TMDBItem {
  id: number;
  title: string;
  poster: string | null;
  backdrop: string | null;
  overview?: string;
  rating?: number;
  year?: string;
  mediaType: 'movie' | 'tv';
  genreIds?: number[];
  source: 'tmdb';
}

export interface TMDBDetailedItem extends TMDBItem {
  runtime?: number;
  genres?: { id: number; name: string }[];
  trailer?: { key: string; name: string };
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  similar?: TMDBItem[];
  tagline?: string;
  status?: string;
  posterUrl?: string;
  backdropUrl?: string;
  // TV specific
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: { season_number: number; episode_count: number; name: string; poster_path: string | null }[];
}

export interface Genre {
  id: number;
  name: string;
}

type TMDBAction = 'trending' | 'movies' | 'tv' | 'search' | 'details' | 'genres' | 'discover';

export const useTMDB = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTMDB = useCallback(async (
    action: TMDBAction,
    options: {
      category?: string;
      page?: number;
      query?: string;
      id?: number;
      mediaType?: 'movie' | 'tv';
    } = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('tmdb-browse', {
        body: {
          action,
          category: options.category,
          page: options.page || 1,
          query: options.query,
          id: options.id,
          mediaType: options.mediaType,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch TMDB data');
      }

      return data;
    } catch (err: any) {
      const message = err.message || 'Failed to load content';
      setError(message);
      console.error('TMDB fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get trending content
  const getTrending = useCallback(async (page = 1) => {
    const data = await fetchTMDB('trending', { page });
    return data?.results as TMDBItem[] || [];
  }, [fetchTMDB]);

  // Get popular/top movies
  const getMovies = useCallback(async (category: 'popular' | 'top_rated' | 'now_playing' | 'upcoming' = 'popular', page = 1) => {
    const data = await fetchTMDB('movies', { category, page });
    return {
      results: data?.results as TMDBItem[] || [],
      totalPages: data?.totalPages || 1,
    };
  }, [fetchTMDB]);

  // Get TV shows
  const getTVShows = useCallback(async (category: 'popular' | 'top_rated' | 'on_the_air' | 'airing_today' = 'popular', page = 1) => {
    const data = await fetchTMDB('tv', { category, page });
    return {
      results: data?.results as TMDBItem[] || [],
      totalPages: data?.totalPages || 1,
    };
  }, [fetchTMDB]);

  // Search content
  const search = useCallback(async (query: string, page = 1) => {
    if (!query.trim()) return { results: [], totalPages: 0 };
    const data = await fetchTMDB('search', { query, page });
    return {
      results: data?.results as TMDBItem[] || [],
      totalPages: data?.totalPages || 1,
    };
  }, [fetchTMDB]);

  // Get item details
  const getDetails = useCallback(async (id: number, mediaType: 'movie' | 'tv'): Promise<TMDBDetailedItem | null> => {
    const data = await fetchTMDB('details', { id, mediaType });
    if (!data?.data) return null;
    
    const item = data.data;
    return {
      id: item.id,
      title: item.title || item.name,
      poster: item.poster_url,
      backdrop: item.backdrop_url,
      overview: item.overview,
      rating: item.vote_average,
      year: (item.release_date || item.first_air_date || '').split('-')[0],
      mediaType,
      source: 'tmdb',
      runtime: item.runtime || item.episode_run_time?.[0],
      genres: item.genres,
      trailer: item.trailer,
      tagline: item.tagline,
      status: item.status,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      cast: item.credits?.cast?.slice(0, 10),
      similar: item.similar?.results?.slice(0, 8).map((s: any) => ({
        id: s.id,
        title: s.title || s.name,
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
        backdrop: s.backdrop_path ? `https://image.tmdb.org/t/p/w780${s.backdrop_path}` : null,
        rating: s.vote_average,
        year: (s.release_date || s.first_air_date || '').split('-')[0],
        mediaType,
        source: 'tmdb',
      })),
      numberOfSeasons: item.number_of_seasons,
      numberOfEpisodes: item.number_of_episodes,
      seasons: item.seasons,
    };
  }, [fetchTMDB]);

  // Get genres
  const getGenres = useCallback(async () => {
    const data = await fetchTMDB('genres');
    return {
      movieGenres: data?.movieGenres as Genre[] || [],
      tvGenres: data?.tvGenres as Genre[] || [],
    };
  }, [fetchTMDB]);

  // Discover by genre
  const discoverByGenre = useCallback(async (genreId: number, mediaType: 'movie' | 'tv' = 'movie', page = 1) => {
    const data = await fetchTMDB('discover', { 
      category: genreId.toString(), 
      mediaType, 
      page 
    });
    return {
      results: data?.results as TMDBItem[] || [],
      totalPages: data?.totalPages || 1,
    };
  }, [fetchTMDB]);

  return {
    loading,
    error,
    getTrending,
    getMovies,
    getTVShows,
    search,
    getDetails,
    getGenres,
    discoverByGenre,
  };
};
