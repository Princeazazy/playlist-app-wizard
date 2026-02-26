import { Channel } from '@/hooks/useIPTV';

export interface MatchableTMDBItem {
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  aliases?: string[];
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

interface PreparedItemCandidate {
  normalizedTitle: string;
  tokens: string[];
}

interface PreparedMatchItem {
  mediaType: 'movie' | 'tv';
  year?: string;
  candidates: PreparedItemCandidate[];
}

const QUALITY_TAG_REGEX = /\b(?:2160p|1080p|720p|480p|4k|uhd|fhd|hdr|dv|x264|x265|hevc|h264|h265|web[-\s]?dl|webrip|bluray|brrip|remux|aac|dts)\b/giu;
const RELEASE_TAG_REGEX = /\b(?:multi\s*sub|subbed|dubbed|dual\s*audio|extended|uncut|proper|repack)\b/giu;
const SEASON_EPISODE_REGEX = /\b(?:s\d{1,2}e\d{1,2}|s\d{1,2}|e\d{1,3}|ep(?:isode)?\s*\d{1,3}|season\s*\d{1,2})\b/giu;
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
    .replace(SEASON_EPISODE_REGEX, ' ')
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

const getBigrams = (text: string): Set<string> => {
  const compact = text.replace(/\s+/g, '');
  if (compact.length < 2) return new Set([compact]);

  const grams = new Set<string>();
  for (let i = 0; i < compact.length - 1; i += 1) {
    grams.add(compact.slice(i, i + 2));
  }
  return grams;
};

const computeBigramSimilarity = (a: string, b: string): number => {
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  if (aBigrams.size === 0 || bBigrams.size === 0) return 0;

  let intersection = 0;
  for (const gram of aBigrams) {
    if (bBigrams.has(gram)) intersection += 1;
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size);
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

const prepareMatchItem = (item: MatchableTMDBItem): PreparedMatchItem => {
  const titles = [item.title, ...(item.aliases || [])]
    .filter((title): title is string => Boolean(title?.trim()))
    .map(title => normalizeMediaTitle(title))
    .filter(Boolean);

  const uniqueTitles = Array.from(new Set(titles));

  return {
    mediaType: item.mediaType,
    year: item.year?.match(/\d{4}/)?.[0],
    candidates: uniqueTitles.map(normalizedTitle => ({
      normalizedTitle,
      tokens: tokenizeTitle(normalizedTitle),
    })),
  };
};

const scoreAgainstCandidate = (
  candidate: PreparedItemCandidate,
  normalizedChannelTitle: string,
  channelTokens: string[]
): number => {
  if (candidate.normalizedTitle === normalizedChannelTitle) return 100;
  if (!candidate.tokens.length || !channelTokens.length) return 0;

  const exactOverlap = candidate.tokens.filter(token => channelTokens.includes(token));
  const coverage = exactOverlap.length / candidate.tokens.length;
  const precision = exactOverlap.length / channelTokens.length;

  let score = coverage * 72 + precision * 18;

  const canUsePhraseMatch = candidate.normalizedTitle.length >= 6;
  if (canUsePhraseMatch && normalizedChannelTitle.includes(candidate.normalizedTitle)) {
    score = Math.max(score, 90);
  }
  if (canUsePhraseMatch && candidate.normalizedTitle.includes(normalizedChannelTitle) && channelTokens.length >= 2) {
    score = Math.max(score, 82);
  }

  const titleSimilarity = computeBigramSimilarity(candidate.normalizedTitle, normalizedChannelTitle);
  score = Math.max(score, titleSimilarity * 65);

  if (exactOverlap.length === candidate.tokens.length && candidate.tokens.length >= 2) {
    score += 10;
  }

  const isShortSingleWordTitle = candidate.tokens.length === 1 && candidate.tokens[0].length <= 4;
  if (isShortSingleWordTitle && exactOverlap.length === 0) {
    return 0;
  }

  const channelLooksLikeAbbreviation = channelTokens.length === 1 && channelTokens[0].length <= 2;
  if (channelLooksLikeAbbreviation && !candidate.tokens.includes(channelTokens[0])) {
    score -= 35;
  }

  if (exactOverlap.length === 0 && titleSimilarity < 0.45) {
    score -= 20;
  }

  return score;
};

const scoreChannelMatch = (preparedItem: PreparedMatchItem, channel: Channel): number => {
  const normalizedChannelTitle = normalizeMediaTitle(channel.name);
  if (!normalizedChannelTitle || normalizedChannelTitle.length <= 2) return 0;

  const channelTokens = tokenizeTitle(normalizedChannelTitle);
  if (!channelTokens.length) return 0;

  let score = 0;
  for (const candidate of preparedItem.candidates) {
    score = Math.max(score, scoreAgainstCandidate(candidate, normalizedChannelTitle, channelTokens));
  }

  const channelYear = extractYear(channel.name);
  if (preparedItem.year && channelYear) {
    if (preparedItem.year === channelYear) {
      score += 10;
    } else {
      score -= 28;
    }
  }

  const inferredType = inferChannelMediaType(channel);
  if (inferredType !== 'unknown' && inferredType !== preparedItem.mediaType) {
    score -= 40;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const rankChannelsForTMDB = (
  item: MatchableTMDBItem,
  channels: Channel[],
  options: MatchOptions = {}
): RankedChannelMatch[] => {
  const { minScore = 50, limit = 5, enforceMediaType = false } = options;
  const preparedItem = prepareMatchItem(item);

  if (preparedItem.candidates.length === 0) return [];

  return channels
    .map(channel => ({
      channel,
      score: scoreChannelMatch(preparedItem, channel),
      inferredType: inferChannelMediaType(channel),
    }))
    .filter(match => {
      if (match.score < minScore) return false;
      if (!enforceMediaType) return true;
      return match.inferredType === 'unknown' || match.inferredType === preparedItem.mediaType;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ channel, score }) => ({ channel, score }));
};
