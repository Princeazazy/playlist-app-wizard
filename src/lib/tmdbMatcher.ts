import { Channel } from '@/hooks/useIPTV';

export interface MatchableTMDBItem {
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
}

export interface RankedChannelMatch {
  channel: Channel;
  score: number;
}

interface MatchOptions {
  minScore?: number;
  limit?: number;
  enforceMediaType?: boolean;
}

const QUALITY_TAG_REGEX = /\b(?:2160p|1080p|720p|480p|4k|uhd|fhd|hdr|dv|x264|x265|hevc|h264|h265|web[-\s]?dl|webrip|bluray|brrip|remux|aac|dts)\b/giu;
const RELEASE_TAG_REGEX = /\b(?:multi\s*sub|subbed|dubbed|dual\s*audio|extended|uncut|proper|repack)\b/giu;
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/g;

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'of', 'part', 'episode', 'season',
  'movie', 'film', 'series', 'show',
  'فيلم', 'مسلسل', 'الحلقة', 'الموسم',
]);

const normalizeMediaTitle = (rawTitle: string): string => {
  return rawTitle
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*\)/g, ' ')
    .replace(QUALITY_TAG_REGEX, ' ')
    .replace(RELEASE_TAG_REGEX, ' ')
    .replace(/[_./-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenizeTitle = (title: string): string[] => {
  return title
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
};

const extractYear = (text: string): string | undefined => {
  const matches = text.match(YEAR_REGEX);
  return matches?.[0];
};

const inferChannelMediaType = (channel: Channel): 'movie' | 'tv' | 'unknown' => {
  if (channel.type === 'movies') return 'movie';
  if (channel.type === 'series') return 'tv';

  const url = channel.url?.toLowerCase() || '';
  if (url.includes('/movie/')) return 'movie';
  if (url.includes('/series/')) return 'tv';

  const group = channel.group?.toLowerCase() || '';
  if (group.includes('series') || group.includes('season')) return 'tv';
  if (group.includes('movie') || group.includes('film') || group.includes('vod')) return 'movie';

  return 'unknown';
};

const scoreChannelMatch = (item: MatchableTMDBItem, channel: Channel): number => {
  const normalizedTitle = normalizeMediaTitle(item.title);
  const normalizedChannelTitle = normalizeMediaTitle(channel.name);

  if (!normalizedTitle || !normalizedChannelTitle) return 0;

  const itemTokens = tokenizeTitle(normalizedTitle);
  const channelTokens = tokenizeTitle(normalizedChannelTitle);

  let score = 0;

  if (normalizedChannelTitle === normalizedTitle) {
    score = 100;
  } else if (
    normalizedChannelTitle.includes(normalizedTitle) ||
    normalizedTitle.includes(normalizedChannelTitle)
  ) {
    score = 88;
  } else if (itemTokens.length > 0 && channelTokens.length > 0) {
    const overlap = itemTokens.filter(token =>
      channelTokens.some(channelToken =>
        channelToken === token || channelToken.includes(token) || token.includes(channelToken)
      )
    );

    const coverage = overlap.length / itemTokens.length;
    const precision = overlap.length / channelTokens.length;
    score = Math.max(score, coverage * 75 + precision * 15);

    if (overlap.length >= 2 && coverage >= 0.6) {
      score += 8;
    }
  }

  const tmdbYear = item.year?.match(/\d{4}/)?.[0];
  const channelYear = extractYear(channel.name);

  if (tmdbYear && channelYear) {
    if (tmdbYear === channelYear) {
      score += 12;
    } else {
      score -= 30;
    }
  }

  const inferredType = inferChannelMediaType(channel);
  if (inferredType !== 'unknown' && inferredType !== item.mediaType) {
    score -= 35;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const rankChannelsForTMDB = (
  item: MatchableTMDBItem,
  channels: Channel[],
  options: MatchOptions = {}
): RankedChannelMatch[] => {
  const { minScore = 50, limit = 5, enforceMediaType = false } = options;

  const ranked = channels
    .map(channel => ({
      channel,
      score: scoreChannelMatch(item, channel),
      inferredType: inferChannelMediaType(channel),
    }))
    .filter(match => {
      if (match.score < minScore) return false;
      if (!enforceMediaType) return true;
      return match.inferredType === 'unknown' || match.inferredType === item.mediaType;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ channel, score }) => ({ channel, score }));

  return ranked;
};
