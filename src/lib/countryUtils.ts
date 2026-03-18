// Comprehensive country mapping with priority ordering
// Streaming services first (priority -10 to -1), then Arabic-speaking countries, then USA, then by alphabet

export interface CountryInfo {
  name: string;
  code: string;
  flagUrl: string;
  priority: number; // Lower = higher priority (negative numbers for streaming services)
  isStreamingService?: boolean;
}

// Countries excluded from Live TV — channels in these groups are hidden
export const EXCLUDED_COUNTRY_CODES = new Set([
  'in',  // India
  'il',  // Israel
  'ge',  // Georgia
  'lt',  // Lithuania
  'cz',  // Czech Republic
  'sk',  // Slovakia
  'lv',  // Latvia
  'ee',  // Estonia
  'hu',  // Hungary
  'bg',  // Bulgaria
  'am',  // Armenia
  'al',  // Albania
  'se',  // Sweden (Nordic)
  'no',  // Norway (Nordic)
  'dk',  // Denmark (Nordic)
  'fi',  // Finland (Nordic)
  'is',  // Iceland (Nordic)
]);

// Import brand logo service for accurate logo matching
import { matchBrandLogo } from './brandLogoService';

// Helper to get brand logo or empty string
const bl = (name: string): string => matchBrandLogo(name) || '';

// Streaming services - key services placed right after Ireland (priority 97)
const STREAMING_SERVICES: Record<string, CountryInfo> = {
  // Key services right after Ireland (priority 98-108)
  'amazon': { name: 'Amazon', code: 'amazon', flagUrl: bl('amazon prime'), priority: 98, isStreamingService: true },
  'amazon prime': { name: 'Amazon Prime', code: 'amazon', flagUrl: bl('amazon prime'), priority: 98, isStreamingService: true },
  'prime video': { name: 'Prime Video', code: 'amazon', flagUrl: bl('amazon prime'), priority: 98, isStreamingService: true },
  'netflix': { name: 'Netflix', code: 'netflix', flagUrl: bl('netflix'), priority: 99, isStreamingService: true },
  'paramount': { name: 'Paramount+', code: 'paramount', flagUrl: bl('paramount'), priority: 100, isStreamingService: true },
  'paramount+': { name: 'Paramount+', code: 'paramount', flagUrl: bl('paramount'), priority: 100, isStreamingService: true },
  'peacock': { name: 'Peacock', code: 'peacock', flagUrl: '/images/peacock-logo.png', priority: 101, isStreamingService: true },
  'max': { name: 'Max', code: 'max', flagUrl: bl('max'), priority: 102, isStreamingService: true },
  'hbo': { name: 'HBO', code: 'hbo', flagUrl: bl('hbo'), priority: 102, isStreamingService: true },
  'hbo max': { name: 'HBO Max', code: 'hbo', flagUrl: bl('hbo'), priority: 102, isStreamingService: true },
  'uefa': { name: 'UEFA', code: 'uefa', flagUrl: bl('uefa'), priority: 103, isStreamingService: true },
  'la liga': { name: 'La Liga', code: 'laliga', flagUrl: '/images/laliga-logo.png', priority: 104, isStreamingService: true },
  'laliga': { name: 'La Liga', code: 'laliga', flagUrl: '/images/laliga-logo.png', priority: 104, isStreamingService: true },
  'bundesliga': { name: 'Bundesliga', code: 'bundesliga', flagUrl: bl('bundesliga'), priority: 105, isStreamingService: true },
  'dazn': { name: 'DAZN', code: 'dazn', flagUrl: bl('dazn'), priority: 106, isStreamingService: true },
  'pluto tv': { name: 'Pluto TV', code: 'plutotv', flagUrl: bl('pluto tv'), priority: 107, isStreamingService: true },
  'pluto': { name: 'Pluto TV', code: 'plutotv', flagUrl: bl('pluto tv'), priority: 107, isStreamingService: true },
  'ppv': { name: 'PPV', code: 'ppv', flagUrl: '/images/ppv-dazn.png', priority: 108, isStreamingService: true },
  'pay per view': { name: 'PPV', code: 'ppv', flagUrl: '/images/ppv-dazn.png', priority: 108, isStreamingService: true },
  // Other streaming services (after countries at bottom)
  'disney': { name: 'Disney+', code: 'disney', flagUrl: bl('disney+'), priority: 1002, isStreamingService: true },
  'disney+': { name: 'Disney+', code: 'disney', flagUrl: bl('disney+'), priority: 1002, isStreamingService: true },
  'apple tv': { name: 'Apple TV+', code: 'appletv', flagUrl: bl('apple tv'), priority: 1004, isStreamingService: true },
  'apple tv+': { name: 'Apple TV+', code: 'appletv', flagUrl: bl('apple tv'), priority: 1004, isStreamingService: true },
  'hulu': { name: 'Hulu', code: 'hulu', flagUrl: bl('hulu'), priority: 1005, isStreamingService: true },
  'starz': { name: 'Starz', code: 'starz', flagUrl: bl('starz'), priority: 1009, isStreamingService: true },
  'showtime': { name: 'Showtime', code: 'showtime', flagUrl: bl('showtime'), priority: 1010, isStreamingService: true },
  'premier league': { name: 'Premier League', code: 'premierleague', flagUrl: bl('premier league'), priority: 1021, isStreamingService: true },
  'serie a': { name: 'Serie A', code: 'seriea', flagUrl: bl('serie a'), priority: 1022, isStreamingService: true },
  // Arabic streaming services - priority 23-27
  'mbc': { name: 'MBC', code: 'mbc', flagUrl: '/images/mbc-logo.png', priority: 23, isStreamingService: true },
  'mbc hd': { name: 'MBC', code: 'mbc', flagUrl: '/images/mbc-logo.png', priority: 23, isStreamingService: true },
  'rotana': { name: 'Rotana', code: 'rotana', flagUrl: '/images/rotana-logo.png', priority: 24, isStreamingService: true },
  'shahid': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png?v=2', priority: 25, isStreamingService: true },
  'shahid vip': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png?v=2', priority: 25, isStreamingService: true },
  'شاهد': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png?v=2', priority: 25, isStreamingService: true },
  'bein': { name: 'beIN', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'bein sport': { name: 'beIN Sports', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'bein sports': { name: 'beIN Sports', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'osn': { name: 'OSN', code: 'osn', flagUrl: '/images/osn-logo.png', priority: 27, isStreamingService: true },
  'alwan': { name: 'Alwan Ent', code: 'alwan', flagUrl: '', priority: 28, isStreamingService: true },
  'alwan ent': { name: 'Alwan Ent', code: 'alwan', flagUrl: '', priority: 28, isStreamingService: true },
  'art': { name: 'Art', code: 'art', flagUrl: '', priority: 29, isStreamingService: true },
  'اي ارتى': { name: 'Art', code: 'art', flagUrl: '', priority: 29, isStreamingService: true },
  'ارتى': { name: 'Art', code: 'art', flagUrl: '', priority: 29, isStreamingService: true },
  '24/7': { name: '24/7', code: '247', flagUrl: '/images/247-logo.png', priority: 30, isStreamingService: true },
  '247': { name: '24/7', code: '247', flagUrl: '/images/247-logo.png', priority: 30, isStreamingService: true },
  'kids': { name: 'Kids', code: 'kids', flagUrl: '/images/kids-logo.png', priority: 31, isStreamingService: true },
  'jlkids': { name: 'Kids', code: 'kids', flagUrl: '/images/kids-logo.png', priority: 31, isStreamingService: true },
  'kids jlkids': { name: 'Kids', code: 'kids', flagUrl: '/images/kids-logo.png', priority: 31, isStreamingService: true },
  'اطفال': { name: 'Kids', code: 'kids', flagUrl: '/images/kids-logo.png', priority: 31, isStreamingService: true },
  // Remaining western services
  'relax tv': { name: 'Relax TV', code: 'relaxtv', flagUrl: '', priority: 1029, isStreamingService: true },
  'marvel': { name: 'Marvel', code: 'marvel', flagUrl: bl('marvel'), priority: 1030, isStreamingService: true },
  'pixar': { name: 'Pixar', code: 'pixar', flagUrl: bl('pixar'), priority: 1031, isStreamingService: true },
  'star wars': { name: 'Star Wars', code: 'starwars', flagUrl: bl('star wars'), priority: 1032, isStreamingService: true },
  'crunchyroll': { name: 'Crunchyroll', code: 'crunchyroll', flagUrl: bl('crunchyroll'), priority: 1033, isStreamingService: true },
  'espn': { name: 'ESPN', code: 'espn', flagUrl: bl('espn'), priority: 1035, isStreamingService: true },
  'sky sports': { name: 'Sky Sports', code: 'skysports', flagUrl: bl('sky sports'), priority: 1036, isStreamingService: true },
  'fox sports': { name: 'Fox Sports', code: 'foxsports', flagUrl: bl('fox sports'), priority: 1037, isStreamingService: true },
  'eurosport': { name: 'Eurosport', code: 'eurosport', flagUrl: bl('eurosport'), priority: 1038, isStreamingService: true },
  'bt sport': { name: 'BT Sport', code: 'btsport', flagUrl: bl('bt sport'), priority: 1039, isStreamingService: true },
  'wwe': { name: 'WWE', code: 'wwe', flagUrl: bl('wwe'), priority: 1041, isStreamingService: true },
  'ufc': { name: 'UFC', code: 'ufc', flagUrl: bl('ufc'), priority: 1042, isStreamingService: true },
  'formula 1': { name: 'Formula 1', code: 'f1', flagUrl: bl('formula 1'), priority: 1043, isStreamingService: true },
  'f1': { name: 'Formula 1', code: 'f1', flagUrl: bl('formula 1'), priority: 1043, isStreamingService: true },
};

// Arabic-speaking countries (priority 1-20)
// Egypt is priority 1 (first in list)
const ARABIC_COUNTRIES: Record<string, CountryInfo> = {
  'eg': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'egypt': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'مصر': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'مصري': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'مصرية': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'egyptian': { name: 'Egypt', code: 'eg', flagUrl: 'https://flagcdn.com/w80/eg.png', priority: 1 },
  'ar': { name: 'Arabic', code: 'arabic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'arabic': { name: 'Arabic', code: 'arabic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'عربي': { name: 'Arabic', code: 'arabic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'عربية': { name: 'Arabic', code: 'arabic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'sa': { name: 'Saudi Arabia', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 3 },
  'saudi': { name: 'Saudi Arabia', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 3 },
  'saudi arabia': { name: 'Saudi Arabia', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 3 },
  'السعودية': { name: 'Saudi Arabia', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 3 },
  'ae': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'uae': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'emirates': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'الامارات': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'الإمارات': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'اماراتي': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'emirati': { name: 'UAE', code: 'ae', flagUrl: 'https://flagcdn.com/w80/ae.png', priority: 4 },
  'jo': { name: 'Jordan', code: 'jo', flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 5 },
  'jordan': { name: 'Jordan', code: 'jo', flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 5 },
  'الاردن': { name: 'Jordan', code: 'jo', flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 5 },
  'الأردن': { name: 'Jordan', code: 'jo', flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 5 },
  'اردني': { name: 'Jordan', code: 'jo', flagUrl: 'https://flagcdn.com/w80/jo.png', priority: 5 },
  'lb': { name: 'Lebanon', code: 'lb', flagUrl: 'https://flagcdn.com/w80/lb.png', priority: 6 },
  'lebanon': { name: 'Lebanon', code: 'lb', flagUrl: 'https://flagcdn.com/w80/lb.png', priority: 6 },
  'لبنان': { name: 'Lebanon', code: 'lb', flagUrl: 'https://flagcdn.com/w80/lb.png', priority: 6 },
  'لبناني': { name: 'Lebanon', code: 'lb', flagUrl: 'https://flagcdn.com/w80/lb.png', priority: 6 },
  'sy': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'syria': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'syrya': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'syrian': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'سوريا': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'سوري': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'سورية': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'شامية': { name: 'Syria', code: 'sy', flagUrl: 'https://flagcdn.com/w80/sy.png', priority: 7 },
  'iq': { name: 'Iraq', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 8 },
  'iraq': { name: 'Iraq', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 8 },
  'العراق': { name: 'Iraq', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 8 },
  'عراقي': { name: 'Iraq', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 8 },
  'kw': { name: 'Kuwait', code: 'kw', flagUrl: 'https://flagcdn.com/w80/kw.png', priority: 9 },
  'kuwait': { name: 'Kuwait', code: 'kw', flagUrl: 'https://flagcdn.com/w80/kw.png', priority: 9 },
  'الكويت': { name: 'Kuwait', code: 'kw', flagUrl: 'https://flagcdn.com/w80/kw.png', priority: 9 },
  'كويتي': { name: 'Kuwait', code: 'kw', flagUrl: 'https://flagcdn.com/w80/kw.png', priority: 9 },
  'qa': { name: 'Qatar', code: 'qa', flagUrl: 'https://flagcdn.com/w80/qa.png', priority: 10 },
  'qatar': { name: 'Qatar', code: 'qa', flagUrl: 'https://flagcdn.com/w80/qa.png', priority: 10 },
  'قطر': { name: 'Qatar', code: 'qa', flagUrl: 'https://flagcdn.com/w80/qa.png', priority: 10 },
  'bh': { name: 'Bahrain', code: 'bh', flagUrl: 'https://flagcdn.com/w80/bh.png', priority: 11 },
  'bahrain': { name: 'Bahrain', code: 'bh', flagUrl: 'https://flagcdn.com/w80/bh.png', priority: 11 },
  'البحرين': { name: 'Bahrain', code: 'bh', flagUrl: 'https://flagcdn.com/w80/bh.png', priority: 11 },
  'om': { name: 'Oman', code: 'om', flagUrl: 'https://flagcdn.com/w80/om.png', priority: 12 },
  'oman': { name: 'Oman', code: 'om', flagUrl: 'https://flagcdn.com/w80/om.png', priority: 12 },
  'عمان': { name: 'Oman', code: 'om', flagUrl: 'https://flagcdn.com/w80/om.png', priority: 12 },
  'ye': { name: 'Yemen', code: 'ye', flagUrl: 'https://flagcdn.com/w80/ye.png', priority: 13 },
  'yemen': { name: 'Yemen', code: 'ye', flagUrl: 'https://flagcdn.com/w80/ye.png', priority: 13 },
  'اليمن': { name: 'Yemen', code: 'ye', flagUrl: 'https://flagcdn.com/w80/ye.png', priority: 13 },
  'يمني': { name: 'Yemen', code: 'ye', flagUrl: 'https://flagcdn.com/w80/ye.png', priority: 13 },
  'ps': { name: 'Palestine', code: 'ps', flagUrl: 'https://flagcdn.com/w80/ps.png', priority: 14 },
  'palestine': { name: 'Palestine', code: 'ps', flagUrl: 'https://flagcdn.com/w80/ps.png', priority: 14 },
  'فلسطين': { name: 'Palestine', code: 'ps', flagUrl: 'https://flagcdn.com/w80/ps.png', priority: 14 },
  'فلسطيني': { name: 'Palestine', code: 'ps', flagUrl: 'https://flagcdn.com/w80/ps.png', priority: 14 },
  'ma': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'morocco': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'moroccan': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'المغرب': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'مغربي': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'مغربية': { name: 'Morocco', code: 'ma', flagUrl: 'https://flagcdn.com/w80/ma.png', priority: 15 },
  'dz': { name: 'Algeria', code: 'dz', flagUrl: 'https://flagcdn.com/w80/dz.png', priority: 16 },
  'algeria': { name: 'Algeria', code: 'dz', flagUrl: 'https://flagcdn.com/w80/dz.png', priority: 16 },
  'الجزائر': { name: 'Algeria', code: 'dz', flagUrl: 'https://flagcdn.com/w80/dz.png', priority: 16 },
  'جزائري': { name: 'Algeria', code: 'dz', flagUrl: 'https://flagcdn.com/w80/dz.png', priority: 16 },
  'tn': { name: 'Tunisia', code: 'tn', flagUrl: 'https://flagcdn.com/w80/tn.png', priority: 17 },
  'tunisia': { name: 'Tunisia', code: 'tn', flagUrl: 'https://flagcdn.com/w80/tn.png', priority: 17 },
  'تونس': { name: 'Tunisia', code: 'tn', flagUrl: 'https://flagcdn.com/w80/tn.png', priority: 17 },
  'تونسي': { name: 'Tunisia', code: 'tn', flagUrl: 'https://flagcdn.com/w80/tn.png', priority: 17 },
  'ly': { name: 'Libya', code: 'ly', flagUrl: 'https://flagcdn.com/w80/ly.png', priority: 18 },
  'libya': { name: 'Libya', code: 'ly', flagUrl: 'https://flagcdn.com/w80/ly.png', priority: 18 },
  'ليبيا': { name: 'Libya', code: 'ly', flagUrl: 'https://flagcdn.com/w80/ly.png', priority: 18 },
  'sd': { name: 'Sudan', code: 'sd', flagUrl: 'https://flagcdn.com/w80/sd.png', priority: 19 },
  'sudan': { name: 'Sudan', code: 'sd', flagUrl: 'https://flagcdn.com/w80/sd.png', priority: 19 },
  'السودان': { name: 'Sudan', code: 'sd', flagUrl: 'https://flagcdn.com/w80/sd.png', priority: 19 },
  'so': { name: 'Somalia', code: 'so', flagUrl: 'https://flagcdn.com/w80/so.png', priority: 20 },
  'somalia': { name: 'Somalia', code: 'so', flagUrl: 'https://flagcdn.com/w80/so.png', priority: 20 },
  'الصومال': { name: 'Somalia', code: 'so', flagUrl: 'https://flagcdn.com/w80/so.png', priority: 20 },
  // Gulf region generic
  'خليجي': { name: 'Gulf', code: 'gulf', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'خليجية': { name: 'Gulf', code: 'gulf', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'khaliji': { name: 'Gulf', code: 'gulf', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'gulf': { name: 'Gulf', code: 'gulf', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  // Islamic/Religious channels - right after Arabic countries
  'islamic': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'islam': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'إسلامي': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'إسلامية': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'اسلامي': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'اسلامية': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'quran': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'قرآن': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  'religious': { name: 'Islamic', code: 'islamic', flagUrl: '/images/islamic-logo.png', priority: 22 },
  // News channels - right after Islamic
  'news': { name: 'News', code: 'news', flagUrl: '/images/news-logo.png', priority: 23 },
  'اخبار': { name: 'News', code: 'news', flagUrl: '/images/news-logo.png', priority: 23 },
  'الاخبارية': { name: 'News', code: 'news', flagUrl: '/images/news-logo.png', priority: 23 },
  'أخبار': { name: 'News', code: 'news', flagUrl: '/images/news-logo.png', priority: 23 },
  'الأخبارية': { name: 'News', code: 'news', flagUrl: '/images/news-logo.png', priority: 23 },
};

// USA (priority 30 - after Arabic services)
const USA_ENTRY: Record<string, CountryInfo> = {
  'us': { name: 'United States', code: 'us', flagUrl: 'https://flagcdn.com/w80/us.png', priority: 30 },
  'usa': { name: 'United States', code: 'us', flagUrl: 'https://flagcdn.com/w80/us.png', priority: 30 },
  'united states': { name: 'United States', code: 'us', flagUrl: 'https://flagcdn.com/w80/us.png', priority: 30 },
  'america': { name: 'United States', code: 'us', flagUrl: 'https://flagcdn.com/w80/us.png', priority: 30 },
};

// Other countries (priority 50+)
const OTHER_COUNTRIES: Record<string, CountryInfo> = {
  'uk': { name: 'United Kingdom', code: 'gb', flagUrl: 'https://flagcdn.com/w80/gb.png', priority: 50 },
  'gb': { name: 'United Kingdom', code: 'gb', flagUrl: 'https://flagcdn.com/w80/gb.png', priority: 50 },
  'england': { name: 'United Kingdom', code: 'gb', flagUrl: 'https://flagcdn.com/w80/gb.png', priority: 50 },
  'british': { name: 'United Kingdom', code: 'gb', flagUrl: 'https://flagcdn.com/w80/gb.png', priority: 50 },
  'de': { name: 'Germany', code: 'de', flagUrl: 'https://flagcdn.com/w80/de.png', priority: 51 },
  'germany': { name: 'Germany', code: 'de', flagUrl: 'https://flagcdn.com/w80/de.png', priority: 51 },
  'german': { name: 'Germany', code: 'de', flagUrl: 'https://flagcdn.com/w80/de.png', priority: 51 },
  'fr': { name: 'France', code: 'fr', flagUrl: 'https://flagcdn.com/w80/fr.png', priority: 52 },
  'france': { name: 'France', code: 'fr', flagUrl: 'https://flagcdn.com/w80/fr.png', priority: 52 },
  'french': { name: 'France', code: 'fr', flagUrl: 'https://flagcdn.com/w80/fr.png', priority: 52 },
  'es': { name: 'Spain', code: 'es', flagUrl: 'https://flagcdn.com/w80/es.png', priority: 53 },
  'spain': { name: 'Spain', code: 'es', flagUrl: 'https://flagcdn.com/w80/es.png', priority: 53 },
  'spanish': { name: 'Spain', code: 'es', flagUrl: 'https://flagcdn.com/w80/es.png', priority: 53 },
  'it': { name: 'Italy', code: 'it', flagUrl: 'https://flagcdn.com/w80/it.png', priority: 54 },
  'italy': { name: 'Italy', code: 'it', flagUrl: 'https://flagcdn.com/w80/it.png', priority: 54 },
  'italian': { name: 'Italy', code: 'it', flagUrl: 'https://flagcdn.com/w80/it.png', priority: 54 },
  'pt': { name: 'Portugal', code: 'pt', flagUrl: 'https://flagcdn.com/w80/pt.png', priority: 55 },
  'portugal': { name: 'Portugal', code: 'pt', flagUrl: 'https://flagcdn.com/w80/pt.png', priority: 55 },
  'portuguese': { name: 'Portugal', code: 'pt', flagUrl: 'https://flagcdn.com/w80/pt.png', priority: 55 },
  'nl': { name: 'Netherlands', code: 'nl', flagUrl: 'https://flagcdn.com/w80/nl.png', priority: 56 },
  'netherlands': { name: 'Netherlands', code: 'nl', flagUrl: 'https://flagcdn.com/w80/nl.png', priority: 56 },
  'dutch': { name: 'Netherlands', code: 'nl', flagUrl: 'https://flagcdn.com/w80/nl.png', priority: 56 },
  'holland': { name: 'Netherlands', code: 'nl', flagUrl: 'https://flagcdn.com/w80/nl.png', priority: 56 },
  'be': { name: 'Belgium', code: 'be', flagUrl: 'https://flagcdn.com/w80/be.png', priority: 57 },
  'belgium': { name: 'Belgium', code: 'be', flagUrl: 'https://flagcdn.com/w80/be.png', priority: 57 },
  'ch': { name: 'Switzerland', code: 'ch', flagUrl: 'https://flagcdn.com/w80/ch.png', priority: 58 },
  'switzerland': { name: 'Switzerland', code: 'ch', flagUrl: 'https://flagcdn.com/w80/ch.png', priority: 58 },
  'swiss': { name: 'Switzerland', code: 'ch', flagUrl: 'https://flagcdn.com/w80/ch.png', priority: 58 },
  'swizterland': { name: 'Switzerland', code: 'ch', flagUrl: 'https://flagcdn.com/w80/ch.png', priority: 58 },
  'at': { name: 'Austria', code: 'at', flagUrl: 'https://flagcdn.com/w80/at.png', priority: 59 },
  'austria': { name: 'Austria', code: 'at', flagUrl: 'https://flagcdn.com/w80/at.png', priority: 59 },
  'pl': { name: 'Poland', code: 'pl', flagUrl: 'https://flagcdn.com/w80/pl.png', priority: 60 },
  'poland': { name: 'Poland', code: 'pl', flagUrl: 'https://flagcdn.com/w80/pl.png', priority: 60 },
  'polish': { name: 'Poland', code: 'pl', flagUrl: 'https://flagcdn.com/w80/pl.png', priority: 60 },
  'polonia': { name: 'Poland', code: 'pl', flagUrl: 'https://flagcdn.com/w80/pl.png', priority: 60 },
  'ru': { name: 'Russia', code: 'ru', flagUrl: 'https://flagcdn.com/w80/ru.png', priority: 61 },
  'russia': { name: 'Russia', code: 'ru', flagUrl: 'https://flagcdn.com/w80/ru.png', priority: 61 },
  'russian': { name: 'Russia', code: 'ru', flagUrl: 'https://flagcdn.com/w80/ru.png', priority: 61 },
  'ua': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'ukraine': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'ukrainian': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'ukrain': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'ukraina': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'ukrane': { name: 'Ukraine', code: 'ua', flagUrl: 'https://flagcdn.com/w80/ua.png', priority: 62 },
  'tr': { name: 'Turkey', code: 'tr', flagUrl: 'https://flagcdn.com/w80/tr.png', priority: 63 },
  'turkey': { name: 'Turkey', code: 'tr', flagUrl: 'https://flagcdn.com/w80/tr.png', priority: 63 },
  'turk': { name: 'Turkey', code: 'tr', flagUrl: 'https://flagcdn.com/w80/tr.png', priority: 63 },
  'turkish': { name: 'Turkey', code: 'tr', flagUrl: 'https://flagcdn.com/w80/tr.png', priority: 63 },
  'in': { name: 'India', code: 'in', flagUrl: 'https://flagcdn.com/w80/in.png', priority: 64 },
  'india': { name: 'India', code: 'in', flagUrl: 'https://flagcdn.com/w80/in.png', priority: 64 },
  'indian': { name: 'India', code: 'in', flagUrl: 'https://flagcdn.com/w80/in.png', priority: 64 },
  'hindi': { name: 'India', code: 'in', flagUrl: 'https://flagcdn.com/w80/in.png', priority: 64 },
  'pk': { name: 'Pakistan', code: 'pk', flagUrl: 'https://flagcdn.com/w80/pk.png', priority: 65 },
  'pakistan': { name: 'Pakistan', code: 'pk', flagUrl: 'https://flagcdn.com/w80/pk.png', priority: 65 },
  'pakistani': { name: 'Pakistan', code: 'pk', flagUrl: 'https://flagcdn.com/w80/pk.png', priority: 65 },
  'pakistanian': { name: 'Pakistan', code: 'pk', flagUrl: 'https://flagcdn.com/w80/pk.png', priority: 65 },
  'bd': { name: 'Bangladesh', code: 'bd', flagUrl: 'https://flagcdn.com/w80/bd.png', priority: 66 },
  'bangladesh': { name: 'Bangladesh', code: 'bd', flagUrl: 'https://flagcdn.com/w80/bd.png', priority: 66 },
  'bangladeshi': { name: 'Bangladesh', code: 'bd', flagUrl: 'https://flagcdn.com/w80/bd.png', priority: 66 },
  'cn': { name: 'China', code: 'cn', flagUrl: 'https://flagcdn.com/w80/cn.png', priority: 67 },
  'china': { name: 'China', code: 'cn', flagUrl: 'https://flagcdn.com/w80/cn.png', priority: 67 },
  'chinese': { name: 'China', code: 'cn', flagUrl: 'https://flagcdn.com/w80/cn.png', priority: 67 },
  'jp': { name: 'Japan', code: 'jp', flagUrl: 'https://flagcdn.com/w80/jp.png', priority: 68 },
  'japan': { name: 'Japan', code: 'jp', flagUrl: 'https://flagcdn.com/w80/jp.png', priority: 68 },
  'japanese': { name: 'Japan', code: 'jp', flagUrl: 'https://flagcdn.com/w80/jp.png', priority: 68 },
  'kr': { name: 'South Korea', code: 'kr', flagUrl: 'https://flagcdn.com/w80/kr.png', priority: 69 },
  'korea': { name: 'South Korea', code: 'kr', flagUrl: 'https://flagcdn.com/w80/kr.png', priority: 69 },
  'korean': { name: 'South Korea', code: 'kr', flagUrl: 'https://flagcdn.com/w80/kr.png', priority: 69 },
  'th': { name: 'Thailand', code: 'th', flagUrl: 'https://flagcdn.com/w80/th.png', priority: 70 },
  'thailand': { name: 'Thailand', code: 'th', flagUrl: 'https://flagcdn.com/w80/th.png', priority: 70 },
  'thai': { name: 'Thailand', code: 'th', flagUrl: 'https://flagcdn.com/w80/th.png', priority: 70 },
  'ph': { name: 'Philippines', code: 'ph', flagUrl: 'https://flagcdn.com/w80/ph.png', priority: 71 },
  'philippines': { name: 'Philippines', code: 'ph', flagUrl: 'https://flagcdn.com/w80/ph.png', priority: 71 },
  'philippine': { name: 'Philippines', code: 'ph', flagUrl: 'https://flagcdn.com/w80/ph.png', priority: 71 },
  'filipino': { name: 'Philippines', code: 'ph', flagUrl: 'https://flagcdn.com/w80/ph.png', priority: 71 },
  'id': { name: 'Indonesia', code: 'id', flagUrl: 'https://flagcdn.com/w80/id.png', priority: 72 },
  'indonesia': { name: 'Indonesia', code: 'id', flagUrl: 'https://flagcdn.com/w80/id.png', priority: 72 },
  'my': { name: 'Malaysia', code: 'my', flagUrl: 'https://flagcdn.com/w80/my.png', priority: 73 },
  'malaysia': { name: 'Malaysia', code: 'my', flagUrl: 'https://flagcdn.com/w80/my.png', priority: 73 },
  'vn': { name: 'Vietnam', code: 'vn', flagUrl: 'https://flagcdn.com/w80/vn.png', priority: 74 },
  'vietnam': { name: 'Vietnam', code: 'vn', flagUrl: 'https://flagcdn.com/w80/vi.png', priority: 74 },
  'lk': { name: 'Sri Lanka', code: 'lk', flagUrl: 'https://flagcdn.com/w80/lk.png', priority: 74 },
  'sri lanka': { name: 'Sri Lanka', code: 'lk', flagUrl: 'https://flagcdn.com/w80/lk.png', priority: 74 },
  'srilanka': { name: 'Sri Lanka', code: 'lk', flagUrl: 'https://flagcdn.com/w80/lk.png', priority: 74 },
  'sirilanka': { name: 'Sri Lanka', code: 'lk', flagUrl: 'https://flagcdn.com/w80/lk.png', priority: 74 },
  'au': { name: 'Australia', code: 'au', flagUrl: 'https://flagcdn.com/w80/au.png', priority: 75 },
  'australia': { name: 'Australia', code: 'au', flagUrl: 'https://flagcdn.com/w80/au.png', priority: 75 },
  'nz': { name: 'New Zealand', code: 'nz', flagUrl: 'https://flagcdn.com/w80/nz.png', priority: 76 },
  'new zealand': { name: 'New Zealand', code: 'nz', flagUrl: 'https://flagcdn.com/w80/nz.png', priority: 76 },
  'ca': { name: 'Canada', code: 'ca', flagUrl: 'https://flagcdn.com/w80/ca.png', priority: 77 },
  'canada': { name: 'Canada', code: 'ca', flagUrl: 'https://flagcdn.com/w80/ca.png', priority: 77 },
  'canadian': { name: 'Canada', code: 'ca', flagUrl: 'https://flagcdn.com/w80/ca.png', priority: 77 },
  'mx': { name: 'Mexico', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 78 },
  'mexico': { name: 'Mexico', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 78 },
  'br': { name: 'Brazil', code: 'br', flagUrl: 'https://flagcdn.com/w80/br.png', priority: 79 },
  'brazil': { name: 'Brazil', code: 'br', flagUrl: 'https://flagcdn.com/w80/br.png', priority: 79 },
  'arg': { name: 'Argentina', code: 'ar', flagUrl: 'https://flagcdn.com/w80/ar.png', priority: 80 },
  'argentina': { name: 'Argentina', code: 'ar', flagUrl: 'https://flagcdn.com/w80/ar.png', priority: 80 },
  'co': { name: 'Colombia', code: 'co', flagUrl: 'https://flagcdn.com/w80/co.png', priority: 81 },
  'colombia': { name: 'Colombia', code: 'co', flagUrl: 'https://flagcdn.com/w80/co.png', priority: 81 },
  'cl': { name: 'Chile', code: 'cl', flagUrl: 'https://flagcdn.com/w80/cl.png', priority: 82 },
  'chile': { name: 'Chile', code: 'cl', flagUrl: 'https://flagcdn.com/w80/cl.png', priority: 82 },
  'pe': { name: 'Peru', code: 'pe', flagUrl: 'https://flagcdn.com/w80/pe.png', priority: 83 },
  'peru': { name: 'Peru', code: 'pe', flagUrl: 'https://flagcdn.com/w80/pe.png', priority: 83 },
  've': { name: 'Venezuela', code: 've', flagUrl: 'https://flagcdn.com/w80/ve.png', priority: 84 },
  'venezuela': { name: 'Venezuela', code: 've', flagUrl: 'https://flagcdn.com/w80/ve.png', priority: 84 },
  'za': { name: 'South Africa', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 85 },
  'south africa': { name: 'South Africa', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 85 },
  'ng': { name: 'Nigeria', code: 'ng', flagUrl: 'https://flagcdn.com/w80/ng.png', priority: 86 },
  'nigeria': { name: 'Nigeria', code: 'ng', flagUrl: 'https://flagcdn.com/w80/ng.png', priority: 86 },
  'ke': { name: 'Kenya', code: 'ke', flagUrl: 'https://flagcdn.com/w80/ke.png', priority: 87 },
  'kenya': { name: 'Kenya', code: 'ke', flagUrl: 'https://flagcdn.com/w80/ke.png', priority: 87 },
  'gh': { name: 'Ghana', code: 'gh', flagUrl: 'https://flagcdn.com/w80/gh.png', priority: 88 },
  'ghana': { name: 'Ghana', code: 'gh', flagUrl: 'https://flagcdn.com/w80/gh.png', priority: 88 },
  'mr': { name: 'Mauritania', code: 'mr', flagUrl: 'https://flagcdn.com/w80/mr.png', priority: 88 },
  'mauritania': { name: 'Mauritania', code: 'mr', flagUrl: 'https://flagcdn.com/w80/mr.png', priority: 88 },
  'mouritania': { name: 'Mauritania', code: 'mr', flagUrl: 'https://flagcdn.com/w80/mr.png', priority: 88 },
  'il': { name: 'Israel', code: 'il', flagUrl: 'https://flagcdn.com/w80/il.png', priority: 89 },
  'israel': { name: 'Israel', code: 'il', flagUrl: 'https://flagcdn.com/w80/il.png', priority: 89 },
  'ir': { name: 'Iran', code: 'ir', flagUrl: 'https://flagcdn.com/w80/ir.png', priority: 90 },
  'iran': { name: 'Iran', code: 'ir', flagUrl: 'https://flagcdn.com/w80/ir.png', priority: 90 },
  'af': { name: 'Afghanistan', code: 'af', flagUrl: 'https://flagcdn.com/w80/af.png', priority: 91 },
  'afghanistan': { name: 'Afghanistan', code: 'af', flagUrl: 'https://flagcdn.com/w80/af.png', priority: 91 },
  'gr': { name: 'Greece', code: 'gr', flagUrl: 'https://flagcdn.com/w80/gr.png', priority: 92 },
  'greece': { name: 'Greece', code: 'gr', flagUrl: 'https://flagcdn.com/w80/gr.png', priority: 92 },
  'se': { name: 'Sweden', code: 'se', flagUrl: 'https://flagcdn.com/w80/se.png', priority: 93 },
  'sweden': { name: 'Sweden', code: 'se', flagUrl: 'https://flagcdn.com/w80/se.png', priority: 93 },
  'no': { name: 'Norway', code: 'no', flagUrl: 'https://flagcdn.com/w80/no.png', priority: 94 },
  'norway': { name: 'Norway', code: 'no', flagUrl: 'https://flagcdn.com/w80/no.png', priority: 94 },
  'dk': { name: 'Denmark', code: 'dk', flagUrl: 'https://flagcdn.com/w80/dk.png', priority: 95 },
  'denmark': { name: 'Denmark', code: 'dk', flagUrl: 'https://flagcdn.com/w80/dk.png', priority: 95 },
  'fi': { name: 'Finland', code: 'fi', flagUrl: 'https://flagcdn.com/w80/fi.png', priority: 96 },
  'finland': { name: 'Finland', code: 'fi', flagUrl: 'https://flagcdn.com/w80/fi.png', priority: 96 },
  'ie': { name: 'Ireland', code: 'ie', flagUrl: 'https://flagcdn.com/w80/ie.png', priority: 97 },
  'ireland': { name: 'Ireland', code: 'ie', flagUrl: 'https://flagcdn.com/w80/ie.png', priority: 97 },
  'cz': { name: 'Czech Republic', code: 'cz', flagUrl: 'https://flagcdn.com/w80/cz.png', priority: 118 },
  'czech': { name: 'Czech Republic', code: 'cz', flagUrl: 'https://flagcdn.com/w80/cz.png', priority: 118 },
  'hu': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 119 },
  'hungary': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 119 },
  'hungaria': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 119 },
  'hungarian': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 119 },
  'ro': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 120 },
  'romania': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 120 },
  'romanian': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 120 },
  'si': { name: 'Slovenia', code: 'si', flagUrl: 'https://flagcdn.com/w80/si.png', priority: 121 },
  'slovenia': { name: 'Slovenia', code: 'si', flagUrl: 'https://flagcdn.com/w80/si.png', priority: 121 },
  'hr': { name: 'Croatia', code: 'hr', flagUrl: 'https://flagcdn.com/w80/hr.png', priority: 122 },
  'croatia': { name: 'Croatia', code: 'hr', flagUrl: 'https://flagcdn.com/w80/hr.png', priority: 122 },
  'rs': { name: 'Serbia', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 123 },
  'serbia': { name: 'Serbia', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 123 },
  'ba': { name: 'Bosnia', code: 'ba', flagUrl: 'https://flagcdn.com/w80/ba.png', priority: 124 },
  'bosnia': { name: 'Bosnia', code: 'ba', flagUrl: 'https://flagcdn.com/w80/ba.png', priority: 124 },
  'me': { name: 'Montenegro', code: 'me', flagUrl: 'https://flagcdn.com/w80/me.png', priority: 125 },
  'montenegro': { name: 'Montenegro', code: 'me', flagUrl: 'https://flagcdn.com/w80/me.png', priority: 125 },
  'mk': { name: 'North Macedonia', code: 'mk', flagUrl: 'https://flagcdn.com/w80/mk.png', priority: 126 },
  'macedonia': { name: 'North Macedonia', code: 'mk', flagUrl: 'https://flagcdn.com/w80/mk.png', priority: 126 },
  'al': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 127 },
  'albania': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 127 },
  'alb': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 127 },
  'xk': { name: 'Kosovo', code: 'xk', flagUrl: 'https://flagcdn.com/w80/xk.png', priority: 128 },
  'kosovo': { name: 'Kosovo', code: 'xk', flagUrl: 'https://flagcdn.com/w80/xk.png', priority: 128 },
  // Balkan as a region (use Serbia flag as representative)
  'balkan': { name: 'Balkan', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 129 },
  'balkans': { name: 'Balkan', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 129 },
  // Additional countries
  'am': { name: 'Armenia', code: 'am', flagUrl: 'https://flagcdn.com/w80/am.png', priority: 130 },
  'armenia': { name: 'Armenia', code: 'am', flagUrl: 'https://flagcdn.com/w80/am.png', priority: 130 },
  'az': { name: 'Azerbaijan', code: 'az', flagUrl: 'https://flagcdn.com/w80/az.png', priority: 131 },
  'azerbaijan': { name: 'Azerbaijan', code: 'az', flagUrl: 'https://flagcdn.com/w80/az.png', priority: 131 },
  'bg': { name: 'Bulgaria', code: 'bg', flagUrl: 'https://flagcdn.com/w80/bg.png', priority: 132 },
  'bulgaria': { name: 'Bulgaria', code: 'bg', flagUrl: 'https://flagcdn.com/w80/bg.png', priority: 132 },
  'ge': { name: 'Georgia', code: 'ge', flagUrl: 'https://flagcdn.com/w80/ge.png', priority: 133 },
  'georgia': { name: 'Georgia', code: 'ge', flagUrl: 'https://flagcdn.com/w80/ge.png', priority: 133 },
  'sk': { name: 'Slovakia', code: 'sk', flagUrl: 'https://flagcdn.com/w80/sk.png', priority: 134 },
  'slovakia': { name: 'Slovakia', code: 'sk', flagUrl: 'https://flagcdn.com/w80/sk.png', priority: 134 },
  'lt': { name: 'Lithuania', code: 'lt', flagUrl: 'https://flagcdn.com/w80/lt.png', priority: 135 },
  'lithuania': { name: 'Lithuania', code: 'lt', flagUrl: 'https://flagcdn.com/w80/lt.png', priority: 135 },
  'lv': { name: 'Latvia', code: 'lv', flagUrl: 'https://flagcdn.com/w80/lv.png', priority: 136 },
  'latvia': { name: 'Latvia', code: 'lv', flagUrl: 'https://flagcdn.com/w80/lv.png', priority: 136 },
  'ee': { name: 'Estonia', code: 'ee', flagUrl: 'https://flagcdn.com/w80/ee.png', priority: 137 },
  'estonia': { name: 'Estonia', code: 'ee', flagUrl: 'https://flagcdn.com/w80/ee.png', priority: 137 },
  'cy': { name: 'Cyprus', code: 'cy', flagUrl: 'https://flagcdn.com/w80/cy.png', priority: 138 },
  'cyprus': { name: 'Cyprus', code: 'cy', flagUrl: 'https://flagcdn.com/w80/cy.png', priority: 138 },
  'mt': { name: 'Malta', code: 'mt', flagUrl: 'https://flagcdn.com/w80/mt.png', priority: 139 },
  'malta': { name: 'Malta', code: 'mt', flagUrl: 'https://flagcdn.com/w80/mt.png', priority: 139 },
  'is': { name: 'Iceland', code: 'is', flagUrl: 'https://flagcdn.com/w80/is.png', priority: 140 },
  'iceland': { name: 'Iceland', code: 'is', flagUrl: 'https://flagcdn.com/w80/is.png', priority: 140 },
  'lu': { name: 'Luxembourg', code: 'lu', flagUrl: 'https://flagcdn.com/w80/lu.png', priority: 141 },
  'luxembourg': { name: 'Luxembourg', code: 'lu', flagUrl: 'https://flagcdn.com/w80/lu.png', priority: 141 },
  'md': { name: 'Moldova', code: 'md', flagUrl: 'https://flagcdn.com/w80/md.png', priority: 142 },
  'moldova': { name: 'Moldova', code: 'md', flagUrl: 'https://flagcdn.com/w80/md.png', priority: 142 },
  'by': { name: 'Belarus', code: 'by', flagUrl: 'https://flagcdn.com/w80/by.png', priority: 143 },
  'belarus': { name: 'Belarus', code: 'by', flagUrl: 'https://flagcdn.com/w80/by.png', priority: 143 },
  'kz': { name: 'Kazakhstan', code: 'kz', flagUrl: 'https://flagcdn.com/w80/kz.png', priority: 144 },
  'kazakhstan': { name: 'Kazakhstan', code: 'kz', flagUrl: 'https://flagcdn.com/w80/kz.png', priority: 144 },
  'uz': { name: 'Uzbekistan', code: 'uz', flagUrl: 'https://flagcdn.com/w80/uz.png', priority: 145 },
  'uzbekistan': { name: 'Uzbekistan', code: 'uz', flagUrl: 'https://flagcdn.com/w80/uz.png', priority: 145 },
  'np': { name: 'Nepal', code: 'np', flagUrl: 'https://flagcdn.com/w80/np.png', priority: 146 },
  'nepal': { name: 'Nepal', code: 'np', flagUrl: 'https://flagcdn.com/w80/np.png', priority: 146 },
  'mm': { name: 'Myanmar', code: 'mm', flagUrl: 'https://flagcdn.com/w80/mm.png', priority: 147 },
  'myanmar': { name: 'Myanmar', code: 'mm', flagUrl: 'https://flagcdn.com/w80/mm.png', priority: 147 },
  'kh': { name: 'Cambodia', code: 'kh', flagUrl: 'https://flagcdn.com/w80/kh.png', priority: 148 },
  'cambodia': { name: 'Cambodia', code: 'kh', flagUrl: 'https://flagcdn.com/w80/kh.png', priority: 148 },
  'la': { name: 'Laos', code: 'la', flagUrl: 'https://flagcdn.com/w80/la.png', priority: 149 },
  'laos': { name: 'Laos', code: 'la', flagUrl: 'https://flagcdn.com/w80/la.png', priority: 149 },
  'mn': { name: 'Mongolia', code: 'mn', flagUrl: 'https://flagcdn.com/w80/mn.png', priority: 150 },
  'mongolia': { name: 'Mongolia', code: 'mn', flagUrl: 'https://flagcdn.com/w80/mn.png', priority: 150 },
  'cu': { name: 'Cuba', code: 'cu', flagUrl: 'https://flagcdn.com/w80/cu.png', priority: 151 },
  'cuba': { name: 'Cuba', code: 'cu', flagUrl: 'https://flagcdn.com/w80/cu.png', priority: 151 },
  'uy': { name: 'Uruguay', code: 'uy', flagUrl: 'https://flagcdn.com/w80/uy.png', priority: 152 },
  'uruguay': { name: 'Uruguay', code: 'uy', flagUrl: 'https://flagcdn.com/w80/uy.png', priority: 152 },
  'ec': { name: 'Ecuador', code: 'ec', flagUrl: 'https://flagcdn.com/w80/ec.png', priority: 153 },
  'ecuador': { name: 'Ecuador', code: 'ec', flagUrl: 'https://flagcdn.com/w80/ec.png', priority: 153 },
  'cr': { name: 'Costa Rica', code: 'cr', flagUrl: 'https://flagcdn.com/w80/cr.png', priority: 154 },
  'costa rica': { name: 'Costa Rica', code: 'cr', flagUrl: 'https://flagcdn.com/w80/cr.png', priority: 154 },
  'et': { name: 'Ethiopia', code: 'et', flagUrl: 'https://flagcdn.com/w80/et.png', priority: 155 },
  'ethiopia': { name: 'Ethiopia', code: 'et', flagUrl: 'https://flagcdn.com/w80/et.png', priority: 155 },
  'tz': { name: 'Tanzania', code: 'tz', flagUrl: 'https://flagcdn.com/w80/tz.png', priority: 156 },
  'tanzania': { name: 'Tanzania', code: 'tz', flagUrl: 'https://flagcdn.com/w80/tz.png', priority: 156 },
  'ug': { name: 'Uganda', code: 'ug', flagUrl: 'https://flagcdn.com/w80/ug.png', priority: 157 },
  'uganda': { name: 'Uganda', code: 'ug', flagUrl: 'https://flagcdn.com/w80/ug.png', priority: 157 },
  'sn': { name: 'Senegal', code: 'sn', flagUrl: 'https://flagcdn.com/w80/sn.png', priority: 158 },
  'senegal': { name: 'Senegal', code: 'sn', flagUrl: 'https://flagcdn.com/w80/sn.png', priority: 158 },
  'cm': { name: 'Cameroon', code: 'cm', flagUrl: 'https://flagcdn.com/w80/cm.png', priority: 159 },
  'cameroon': { name: 'Cameroon', code: 'cm', flagUrl: 'https://flagcdn.com/w80/cm.png', priority: 159 },
  'ci': { name: 'Ivory Coast', code: 'ci', flagUrl: 'https://flagcdn.com/w80/ci.png', priority: 160 },
  'ivory coast': { name: 'Ivory Coast', code: 'ci', flagUrl: 'https://flagcdn.com/w80/ci.png', priority: 160 },
  'kurdish': { name: 'Kurdistan', code: 'kurdistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Flag_of_Kurdistan.svg/80px-Flag_of_Kurdistan.svg.png', priority: 161 },
  'kurd': { name: 'Kurdistan', code: 'kurdistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Flag_of_Kurdistan.svg/80px-Flag_of_Kurdistan.svg.png', priority: 161 },
  'kurdistan': { name: 'Kurdistan', code: 'kurdistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Flag_of_Kurdistan.svg/80px-Flag_of_Kurdistan.svg.png', priority: 161 },
  'كردي': { name: 'Kurdistan', code: 'kurdistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Flag_of_Kurdistan.svg/80px-Flag_of_Kurdistan.svg.png', priority: 161 },
  'كردية': { name: 'Kurdistan', code: 'kurdistan', flagUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Flag_of_Kurdistan.svg/80px-Flag_of_Kurdistan.svg.png', priority: 161 },
  'latino': { name: 'Latino', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 162 },
  'latin': { name: 'Latin', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 162 },
  'caribbean': { name: 'Caribbean', code: 'jm', flagUrl: 'https://flagcdn.com/w80/jm.png', priority: 163 },
  'african': { name: 'African', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 164 },
  'africa': { name: 'Africa', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 164 },
  'scandinavian': { name: 'Scandinavian', code: 'se', flagUrl: 'https://flagcdn.com/w80/se.png', priority: 165 },
  'asia': { name: 'Asia Mix', code: 'asia', flagUrl: '/images/asia-mix-logo.png', priority: 166 },
  'asian': { name: 'Asia Mix', code: 'asia', flagUrl: '/images/asia-mix-logo.png', priority: 166 },
  'آسيا': { name: 'Asia Mix', code: 'asia', flagUrl: '/images/asia-mix-logo.png', priority: 166 },
  'christian': { name: 'Christian', code: 'christian', flagUrl: '/images/christian-logo.png', priority: 167 },
  'مسيحية': { name: 'Christian', code: 'christian', flagUrl: '/images/christian-logo.png', priority: 167 },
  'المسيحية': { name: 'Christian', code: 'christian', flagUrl: '/images/christian-logo.png', priority: 167 },
  'لمسيحية': { name: 'Christian', code: 'christian', flagUrl: '/images/christian-logo.png', priority: 167 },
};

// Merged all countries (not including streaming services - checked separately)
const ALL_COUNTRIES = { ...ARABIC_COUNTRIES, ...USA_ENTRY, ...OTHER_COUNTRIES };

// All categories including streaming services
const ALL_CATEGORIES = { ...STREAMING_SERVICES, ...ALL_COUNTRIES };

// Pre-sorted country keys by length descending (computed once)
const SORTED_COUNTRY_KEYS = Object.keys(ALL_COUNTRIES).sort((a, b) => b.length - a.length);

// Check if a group name matches a streaming service (must check BEFORE countries)
const getStreamingServiceInfo = (group: string): CountryInfo | null => {
  const groupLower = group.toLowerCase().trim();
  
  // Direct match
  if (STREAMING_SERVICES[groupLower]) {
    return STREAMING_SERVICES[groupLower];
  }
  
  // Check if group CONTAINS streaming service name as a word (e.g., "SA | AMAZON ACTION", "AR NETFLIX MOVIES")
  // Priority order: longer keys first to match "amazon prime" before "amazon"
  const sortedKeys = Object.keys(STREAMING_SERVICES).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const isArabic = /[\u0600-\u06FF]/.test(key);
    if (isArabic) {
      // Arabic: simple substring match
      if (group.includes(key) || groupLower.includes(key)) {
        return STREAMING_SERVICES[key];
      }
    } else {
      // Latin: word boundary match
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(groupLower)) {
        return STREAMING_SERVICES[key];
      }
    }
  }
  
  return null;
};

// Memoization cache for getCountryInfo - avoids repeated expensive regex matching
const _countryInfoCache = new Map<string, CountryInfo | null>();

// Get country info from group name (memoized)
export const getCountryInfo = (group: string): CountryInfo | null => {
  const cacheKey = group;
  const cached = _countryInfoCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = _getCountryInfoUncached(group);
  _countryInfoCache.set(cacheKey, result);
  return result;
};

const _getCountryInfoUncached = (group: string): CountryInfo | null => {
  const groupLower = group.toLowerCase().trim();

  // FIRST: Check for streaming services - they should NEVER match as countries
  const streamingService = getStreamingServiceInfo(group);
  if (streamingService) {
    return streamingService;
  }

  // Direct exact match for countries
  if (ALL_COUNTRIES[groupLower]) {
    const info = ALL_COUNTRIES[groupLower];
    if (EXCLUDED_COUNTRY_CODES.has(info.code)) return null;
    return info;
  }

  // Check for full country name matches FIRST (before prefix matching)
  // This ensures "AR | Egypt" maps to Egypt, not generic Arabic
  for (const [key, info] of Object.entries(ALL_COUNTRIES)) {
    if (groupLower === info.name.toLowerCase()) {
      if (EXCLUDED_COUNTRY_CODES.has(info.code)) return null;
      return info;
    }
  }

  // PRIORITY: Check if a SPECIFIC country name appears in the group string
  // This must happen BEFORE the 2-letter prefix check so "AR | Egypt" → Egypt, not Arabic
  // Check longer keys first to prefer specific matches over generic ones
  let specificMatch: CountryInfo | null = null;
  let specificMatchLength = 0;
  
  for (const key of SORTED_COUNTRY_KEYS) {
    const info = ALL_COUNTRIES[key];
    // Skip generic "Arabic"/"ar" entries — we want specific countries to win
    if (info.code === 'arabic' || info.code === 'gulf') continue;
    
    const isArabic = /[\u0600-\u06FF]/.test(key);
    let matched = false;
    
    if (isArabic) {
      if (groupLower.includes(key) || group.includes(key)) {
        matched = true;
      }
    } else {
      const countryName = info.name.toLowerCase();
      const nameRegex = new RegExp(`\\b${countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (nameRegex.test(groupLower)) {
        matched = true;
      } else if (key.length >= 3) {
        const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (keyRegex.test(groupLower)) {
          matched = true;
        }
      }
    }
    
    if (matched && key.length > specificMatchLength) {
      if (EXCLUDED_COUNTRY_CODES.has(info.code)) return null;
      specificMatch = info;
      specificMatchLength = key.length;
    }
  }
  
  if (specificMatch) {
    return specificMatch;
  }

  // NOW check 2-letter prefix codes (e.g., "AR | ..." with no specific country found → Arabic)
  const codeMatch = groupLower.match(/^([a-z]{2})[\s|:\-]/);
  if (codeMatch && ALL_COUNTRIES[codeMatch[1]]) {
    const codeInfo = ALL_COUNTRIES[codeMatch[1]];
    if (EXCLUDED_COUNTRY_CODES.has(codeInfo.code)) return null;
    return codeInfo;
  }

  // Fallback: check generic Arabic/Gulf keys last
  for (const key of SORTED_COUNTRY_KEYS) {
    const info = ALL_COUNTRIES[key];
    if (info.code !== 'arabic' && info.code !== 'gulf') continue;
    
    const isArabic = /[\u0600-\u06FF]/.test(key);
    if (isArabic) {
      if (groupLower.includes(key) || group.includes(key)) {
        return info;
      }
    } else if (key.length >= 3) {
      const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (keyRegex.test(groupLower)) {
        return info;
      }
    }
  }

  // For 2-letter codes, only match at start or after separator
  const twoLetterMatch = groupLower.match(/^([a-z]{2})(?:\s|$|[|:\-])/);
  if (twoLetterMatch && ALL_COUNTRIES[twoLetterMatch[1]]) {
    const tlInfo = ALL_COUNTRIES[twoLetterMatch[1]];
    if (EXCLUDED_COUNTRY_CODES.has(tlInfo.code)) return null;
    return tlInfo;
  }

  return null;
};

// Normalize a group name to a canonical country key for merging duplicates
// Returns the country code if it's a recognized country, otherwise the original group name
export const normalizeGroupName = (group: string): string => {
  const countryInfo = getCountryInfo(group);
  if (countryInfo) {
    // Return the country code as the canonical key
    return countryInfo.code;
  }
  // Not a country - return the original group name lowercased for consistency
  return group.toLowerCase().trim();
};

// Helper to properly capitalize words
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Get display name for a group (properly capitalized)
export const getDisplayName = (group: string): string => {
  const countryInfo = getCountryInfo(group);
  
  // ALWAYS strip ALL leading 2-3 letter country/region codes separated by pipes, colons, dashes
  // e.g., "Am | Ca | Pluto Tv" → "Pluto Tv", "Eu | Exyu | Bosna" → "Bosna"
  let cleaned = group.trim();
  cleaned = cleaned.replace(/^(?:[A-Za-z]{2,4}\s*[\|:\-]\s*)+/gi, '').trim();
  // Also handle "AR Sports", "UK General", "AM Music" style (2-3 letter code + space + word)
  cleaned = cleaned.replace(/^[A-Za-z]{2,3}\s+(?=\w)/i, '').trim();
  
  // If we got a meaningful cleaned name, use it
  if (cleaned.length > 1) {
    return cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  
  // Fallback to country name if detected
  if (countryInfo) {
    return countryInfo.name;
  }
  
  // Last fallback: title-case the original
  return group.trim()
    .split(/(\s*\|\s*|\s+)/)
    .map(part => {
      if (part.trim() === '|' || part.trim().length === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

// Get flag URL for a group
export const getCountryFlagUrl = (group: string): string | null => {
  const countryInfo = getCountryInfo(group);
  return countryInfo?.flagUrl || null;
};

// Get priority for sorting (lower = higher priority)
export const getGroupPriority = (group: string): number => {
  const countryInfo = getCountryInfo(group);
  return countryInfo?.priority || 999; // Non-country groups go last
};

// Category emoji for non-country groups and streaming services
export const getCategoryEmoji = (group: string): string => {
  const groupLower = group.toLowerCase();
  // Streaming services first
  if (groupLower.includes('amazon') || groupLower.includes('prime video')) return '📦';
  if (groupLower.includes('netflix')) return '🎬';
  if (groupLower.includes('disney')) return '🏰';
  if (groupLower.includes('hbo') || groupLower === 'max') return '🎭';
  if (groupLower.includes('apple tv')) return '🍎';
  if (groupLower.includes('hulu')) return '💚';
  if (groupLower.includes('paramount')) return '⛰️';
  if (groupLower.includes('peacock')) return '🦚';
  if (groupLower.includes('starz')) return '⭐';
  if (groupLower.includes('showtime')) return '🎪';
  // General categories
  if (groupLower.includes('sport')) return '🏆';
  if (groupLower.includes('news')) return '📰';
  if (groupLower.includes('movie') || groupLower.includes('vod')) return '🎥';
  if (groupLower.includes('series')) return '📺';
  if (groupLower.includes('kids') || groupLower.includes('cartoon')) return '🧸';
  if (groupLower.includes('music')) return '🎵';
  if (groupLower.includes('documentary') || groupLower.includes('doc')) return '🎓';
  if (groupLower.includes('adult') || groupLower.includes('xxx')) return '🔞';
  if (groupLower.includes('religious') || groupLower.includes('islam')) return '🕌';
  if (groupLower.includes('cooking') || groupLower.includes('food')) return '🍳';
  if (groupLower.includes('premium')) return '⭐';
  if (groupLower.includes('multichoice') || groupLower.includes('dstv')) return '📡';
  return '📺';
};

// Merge and sort groups, combining duplicate countries
export const mergeAndSortGroups = (
  groupData: Map<string, { count: number; firstLogo?: string; originalNames: string[] }>
): { name: string; displayName: string; count: number; firstLogo?: string; originalNames: string[] }[] => {
  // Merge groups by normalized name
  const mergedGroups = new Map<string, { 
    displayName: string; 
    count: number; 
    firstLogo?: string; 
    originalNames: string[];
    priority: number;
  }>();

  for (const [originalName, data] of groupData.entries()) {
    const normalizedKey = normalizeGroupName(originalName);
    const countryInfo = getCountryInfo(originalName);
    
    const existing = mergedGroups.get(normalizedKey);
    if (existing) {
      // Merge with existing
      existing.count += data.count;
      existing.originalNames.push(originalName);
      if (!existing.firstLogo && data.firstLogo) {
        existing.firstLogo = data.firstLogo;
      }
    } else {
      // Create new entry
      mergedGroups.set(normalizedKey, {
        displayName: countryInfo?.name || getDisplayName(originalName),
        count: data.count,
        firstLogo: data.firstLogo,
        originalNames: [originalName],
        priority: countryInfo?.priority || 999,
      });
    }
  }

  // Second pass: merge small groups (≤10 items) into the closest larger group
  const SMALL_GROUP_THRESHOLD = 10;
  const smallGroups: string[] = [];
  const largeGroups: string[] = [];
  
  for (const [key, data] of mergedGroups.entries()) {
    if (data.count <= SMALL_GROUP_THRESHOLD) {
      smallGroups.push(key);
    } else {
      largeGroups.push(key);
    }
  }

  // Find best match for each small group based on shared keywords
  for (const smallKey of smallGroups) {
    const smallData = mergedGroups.get(smallKey)!;
    const smallWords = smallKey.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 1);
    
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const largeKey of largeGroups) {
      const largeWords = largeKey.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 1);
      // Count shared keywords
      let score = 0;
      for (const word of smallWords) {
        if (largeWords.some(lw => lw.includes(word) || word.includes(lw))) {
          score++;
        }
      }
      // Bonus for same language/region keywords
      const langKeywords = ['french', 'fr', 'german', 'deutsch', 'anime', 'korean', 'turkish', 'indian', 'arabic', 'english', 'albani', 'cartoon', 'documentary', 'comedy', 'drama', 'action', 'horror', 'kids', 'ramadan', 'islamic', 'songs', 'netflix', 'disney', 'hbo'];
      for (const kw of langKeywords) {
        if (smallKey.toLowerCase().includes(kw) && largeKey.toLowerCase().includes(kw)) {
          score += 3;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = largeKey;
      }
    }

    // Only merge if we found a reasonable match (score >= 2)
    if (bestMatch && bestScore >= 2) {
      const targetData = mergedGroups.get(bestMatch)!;
      targetData.count += smallData.count;
      targetData.originalNames.push(...smallData.originalNames);
      mergedGroups.delete(smallKey);
    }
  }

  // Convert to array, filter out groups with fewer than 3 channels, and sort
  return Array.from(mergedGroups.entries())
    .filter(([_, data]) => data.count >= 3) // Remove groups with fewer than 3 channels
    .map(([name, data]) => ({
      name,
      displayName: data.displayName,
      count: data.count,
      firstLogo: data.firstLogo,
      originalNames: data.originalNames,
    }))
    .sort((a, b) => {
      const priorityA = getGroupPriority(a.originalNames[0]);
      const priorityB = getGroupPriority(b.originalNames[0]);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.displayName.localeCompare(b.displayName);
    });
};

// Sort groups with Arabic first, then USA, then alphabetically
export const sortGroupsByPriority = (groups: { name: string; count: number }[]): { name: string; count: number }[] => {
  return [...groups].sort((a, b) => {
    const priorityA = getGroupPriority(a.name);
    const priorityB = getGroupPriority(b.name);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Same priority - sort alphabetically
    return a.name.localeCompare(b.name);
  });
};

// Translate Arabic group names to English for display
export const translateGroupName = (groupName: string): string => {
  // Exact overrides for malformed group names (case-insensitive check)
  const exactOverrides: Record<string, string> = {
    'kids jlkids': 'Kids',
    'jlkids': 'Kids',
  };
  const lowerName = groupName.toLowerCase().trim();
  if (exactOverrides[lowerName]) return exactOverrides[lowerName];
  // Also check if groupName contains the key
  for (const [key, value] of Object.entries(exactOverrides)) {
    if (lowerName.includes(key)) return value;
  }

  const translations: Record<string, string> = {
    // Movies - full phrases first
    'أفلام عربية حديثة': 'New Arabic Movies',
    'أفلام عربية': 'Arabic Movies',
    'افلام عربي': 'Arabic Movies',
    'افلام عربية': 'Arabic Movies',
    'اجنبية مترجمة': 'Foreign Subtitled',
    'افلام اجنبية': 'Foreign Movies',
    'من عام': 'From Year',
    // Series - full phrases first
    'مسلسلات مصرية': 'Egyptian Series',
    'مسلسلات خليجية': 'Gulf Series',
    'مسلسلات تركية': 'Turkish Series',
    'مسلسلات اجنبية': 'Foreign Series',
    'مسلسلات عربية': 'Arabic Series',
    'مسلسلات عربي': 'Arabic Series',
    'مسلسلات شامية': 'Levantine Series',
    'مسلسلات مغربية': 'Moroccan Series',
    'مسلسلات تركي': 'Turkish Series',
    'مسلسلات': 'Series',
    // Regional content
    'خليجية': 'Gulf',
    'مصرية': 'Egyptian',
    'شامية': 'Levantine',
    'مغربية': 'Moroccan',
    'والامازيغ': '& Amazigh',
    'الامازيغية': 'Amazigh',
    'الامازيغ': 'Amazigh',
    'تليفزيونية': 'TV',
    'تلفزيونية': 'TV',
    'تركي': 'Turkish',
    'تركية': 'Turkish',
    'قبل عام': 'Before Year',
    'عربي': 'Arabic',
    'عربية': 'Arabic',
    'مترجمة': 'Subtitled',
    'اجنبية': 'Foreign',
    // Ramadan
    'رمضان': 'Ramadan',
    // Genres
    'كوميدي': 'Comedy',
    'كوميديا': 'Comedy',
    'رعب': 'Horror',
    'رومانسي': 'Romance',
    'رومانسية': 'Romance',
    'دراما': 'Drama',
    'انمي': 'Anime',
    'اطفال': 'Kids',
    'وثائقي': 'Documentary',
    'كرتون': 'Cartoon',
    'خيال علمي': 'Sci-Fi',
    'غموض': 'Mystery',
    'حركة': 'Action',
    'ومغامرة': '& Adventure',
    'مغامرة': 'Adventure',
    'اثارة': 'Thriller',
    'جريمة': 'Crime',
    'تاريخي': 'Historical',
    'حرب': 'War',
    'موسيقى': 'Music',
    'عائلي': 'Family',
    // Connectors
    ' و ': ' & ',
    'و ': '& ',
  };

  let translated = groupName;
  
  // Sort by length descending to match longer phrases first
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
  
  for (const arabic of sortedKeys) {
    if (translated.includes(arabic)) {
      translated = translated.replace(new RegExp(arabic, 'g'), translations[arabic]);
    }
  }
  
  // Clean up extra spaces and ampersands
  translated = translated.replace(/\s+/g, ' ').replace(/&\s+&/g, '&').trim();
  
  return translated;
};
