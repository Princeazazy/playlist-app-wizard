import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// TMDB API base URL
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBContent {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: string;
  original_language?: string;
}

interface TMDBResponse {
  results: TMDBContent[];
  total_pages?: number;
  total_results?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
    if (!TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY is not configured');
    }

    const { action, category, page = 1, query, id, mediaType } = await req.json();

    // Use v3 API key format (append to URL)
    const apiKeyParam = `api_key=${TMDB_API_KEY}`;

    let endpoint = '';
    let results: any[] = [];

    switch (action) {
      case 'trending':
        // Get trending movies and TV shows
        endpoint = `${TMDB_BASE}/trending/all/week?${apiKeyParam}&page=${page}`;
        break;

      case 'movies':
        // Get movies by category
        switch (category) {
          case 'popular':
            endpoint = `${TMDB_BASE}/movie/popular?${apiKeyParam}&page=${page}`;
            break;
          case 'top_rated':
            endpoint = `${TMDB_BASE}/movie/top_rated?${apiKeyParam}&page=${page}`;
            break;
          case 'now_playing':
            endpoint = `${TMDB_BASE}/movie/now_playing?${apiKeyParam}&page=${page}`;
            break;
          case 'upcoming':
            endpoint = `${TMDB_BASE}/movie/upcoming?${apiKeyParam}&page=${page}`;
            break;
          default:
            endpoint = `${TMDB_BASE}/movie/popular?${apiKeyParam}&page=${page}`;
        }
        break;

      case 'tv':
        // Get TV shows by category
        switch (category) {
          case 'popular':
            endpoint = `${TMDB_BASE}/tv/popular?${apiKeyParam}&page=${page}`;
            break;
          case 'top_rated':
            endpoint = `${TMDB_BASE}/tv/top_rated?${apiKeyParam}&page=${page}`;
            break;
          case 'on_the_air':
            endpoint = `${TMDB_BASE}/tv/on_the_air?${apiKeyParam}&page=${page}`;
            break;
          case 'airing_today':
            endpoint = `${TMDB_BASE}/tv/airing_today?${apiKeyParam}&page=${page}`;
            break;
          default:
            endpoint = `${TMDB_BASE}/tv/popular?${apiKeyParam}&page=${page}`;
        }
        break;

      case 'search':
        // Search for movies and TV shows
        if (!query) {
          throw new Error('Search query is required');
        }
        endpoint = `${TMDB_BASE}/search/multi?${apiKeyParam}&query=${encodeURIComponent(query)}&page=${page}`;
        break;

      case 'details':
        // Get details for a specific movie or TV show
        if (!id || !mediaType) {
          throw new Error('ID and mediaType are required');
        }
        endpoint = `${TMDB_BASE}/${mediaType}/${id}?${apiKeyParam}&append_to_response=videos,credits,similar`;
        break;

      case 'genres':
        // Get genre lists for both movies and TV
        const [movieGenres, tvGenres] = await Promise.all([
          fetch(`${TMDB_BASE}/genre/movie/list?${apiKeyParam}`).then(r => r.json()),
          fetch(`${TMDB_BASE}/genre/tv/list?${apiKeyParam}`).then(r => r.json()),
        ]);
        
        return new Response(JSON.stringify({
          success: true,
          movieGenres: movieGenres.genres || [],
          tvGenres: tvGenres.genres || [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'discover':
        // Discover content by genre
        const genreParam = category ? `&with_genres=${category}` : '';
        endpoint = mediaType === 'tv' 
          ? `${TMDB_BASE}/discover/tv?${apiKeyParam}&page=${page}${genreParam}&sort_by=popularity.desc`
          : `${TMDB_BASE}/discover/movie?${apiKeyParam}&page=${page}${genreParam}&sort_by=popularity.desc`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TMDB API error:', response.status, errorText);
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    // For details endpoint, return the full response
    if (action === 'details') {
      return new Response(JSON.stringify({
        success: true,
        data: {
          ...data,
          poster_url: data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null,
          backdrop_url: data.backdrop_path ? `${TMDB_IMAGE_BASE}/original${data.backdrop_path}` : null,
          trailer: data.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') 
            || data.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser')
            || data.videos?.results?.find((v: any) => v.site === 'YouTube'),
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform results to include full image URLs
    results = (data.results || []).map((item: TMDBContent) => ({
      id: item.id,
      title: item.title || item.name,
      poster: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
      backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}` : null,
      overview: item.overview,
      rating: item.vote_average,
      year: (item.release_date || item.first_air_date || '').split('-')[0],
      mediaType: item.media_type || (action === 'tv' ? 'tv' : 'movie'),
      genreIds: item.genre_ids,
      source: 'tmdb',
    }));

    return new Response(JSON.stringify({
      success: true,
      results,
      page: data.page || page,
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || results.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('TMDB browse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
