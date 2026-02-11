// Comprehensive country mapping with priority ordering
// Streaming services first (priority -10 to -1), then Arabic-speaking countries, then USA, then by alphabet

export interface CountryInfo {
  name: string;
  code: string;
  flagUrl: string;
  priority: number; // Lower = higher priority (negative numbers for streaming services)
  isStreamingService?: boolean;
}

// Streaming services - these should NEVER be mixed with countries (priority 1000+ to appear at bottom)
const STREAMING_SERVICES: Record<string, CountryInfo> = {
  'amazon': { name: 'Amazon', code: 'amazon', flagUrl: '', priority: 1000, isStreamingService: true },
  'amazon prime': { name: 'Amazon Prime', code: 'amazon', flagUrl: '', priority: 1000, isStreamingService: true },
  'prime video': { name: 'Prime Video', code: 'amazon', flagUrl: '', priority: 1000, isStreamingService: true },
  'netflix': { name: 'Netflix', code: 'netflix', flagUrl: '', priority: 1001, isStreamingService: true },
  'disney': { name: 'Disney+', code: 'disney', flagUrl: '', priority: 1002, isStreamingService: true },
  'disney+': { name: 'Disney+', code: 'disney', flagUrl: '', priority: 1002, isStreamingService: true },
  'hbo': { name: 'HBO', code: 'hbo', flagUrl: '', priority: 1003, isStreamingService: true },
  'hbo max': { name: 'HBO Max', code: 'hbo', flagUrl: '', priority: 1003, isStreamingService: true },
  'apple tv': { name: 'Apple TV+', code: 'appletv', flagUrl: '', priority: 1004, isStreamingService: true },
  'apple tv+': { name: 'Apple TV+', code: 'appletv', flagUrl: '', priority: 1004, isStreamingService: true },
  'hulu': { name: 'Hulu', code: 'hulu', flagUrl: '', priority: 1005, isStreamingService: true },
  'paramount': { name: 'Paramount+', code: 'paramount', flagUrl: '', priority: 1006, isStreamingService: true },
  'paramount+': { name: 'Paramount+', code: 'paramount', flagUrl: '', priority: 1006, isStreamingService: true },
  'peacock': { name: 'Peacock', code: 'peacock', flagUrl: '', priority: 1007, isStreamingService: true },
  'max': { name: 'Max', code: 'max', flagUrl: '', priority: 1008, isStreamingService: true },
  'starz': { name: 'Starz', code: 'starz', flagUrl: '', priority: 1009, isStreamingService: true },
  'showtime': { name: 'Showtime', code: 'showtime', flagUrl: '', priority: 1010, isStreamingService: true },
  // Sports leagues - separate from countries
  'uefa': { name: 'UEFA', code: 'uefa', flagUrl: '', priority: 1020, isStreamingService: true },
  'premier league': { name: 'Premier League', code: 'premierleague', flagUrl: '', priority: 1021, isStreamingService: true },
  'serie a': { name: 'Serie A', code: 'seriea', flagUrl: '', priority: 1022, isStreamingService: true },
  'la liga': { name: 'La Liga', code: 'laliga', flagUrl: '/images/laliga-logo.png', priority: 1023, isStreamingService: true },
  'laliga': { name: 'La Liga', code: 'laliga', flagUrl: '/images/laliga-logo.png', priority: 1023, isStreamingService: true },
  // (bundesliga merged into shahid below)
  // Arabic streaming services - priority 23-27 (right after Islamic/Arabic countries)
  'mbc': { name: 'MBC', code: 'mbc', flagUrl: '/images/mbc-logo.png', priority: 23, isStreamingService: true },
  'mbc hd': { name: 'MBC', code: 'mbc', flagUrl: '/images/mbc-logo.png', priority: 23, isStreamingService: true },
  'rotana': { name: 'Rotana', code: 'rotana', flagUrl: '', priority: 24, isStreamingService: true },
  'shahid': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png', priority: 25, isStreamingService: true },
  'shahid vip': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png', priority: 25, isStreamingService: true },
  'شاهد': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png', priority: 25, isStreamingService: true },
  'bundesliga': { name: 'Shahid', code: 'shahid', flagUrl: '/images/shahid-logo.png', priority: 25, isStreamingService: true },
  'bein': { name: 'beIN', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'bein sport': { name: 'beIN Sports', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'bein sports': { name: 'beIN Sports', code: 'bein', flagUrl: '/images/bein-logo.png', priority: 26, isStreamingService: true },
  'osn': { name: 'OSN', code: 'osn', flagUrl: '/images/osn-logo.png', priority: 27, isStreamingService: true },
  // Western streaming services (priority 1000+)
  'relax tv': { name: 'Relax TV', code: 'relaxtv', flagUrl: '', priority: 1029, isStreamingService: true },
  'marvel': { name: 'Marvel', code: 'marvel', flagUrl: '', priority: 1030, isStreamingService: true },
  'pixar': { name: 'Pixar', code: 'pixar', flagUrl: '', priority: 1031, isStreamingService: true },
  'star wars': { name: 'Star Wars', code: 'starwars', flagUrl: '', priority: 1032, isStreamingService: true },
  'crunchyroll': { name: 'Crunchyroll', code: 'crunchyroll', flagUrl: '', priority: 1033, isStreamingService: true },
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
  'ar': { name: 'Arabic', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'arabic': { name: 'Arabic', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'عربي': { name: 'Arabic', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
  'عربية': { name: 'Arabic', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 2 },
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
  'خليجي': { name: 'Gulf', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'خليجية': { name: 'Gulf', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'khaliji': { name: 'Gulf', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  'gulf': { name: 'Gulf', code: 'sa', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 21 },
  // Islamic/Religious channels - right after Arabic countries
  'islamic': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'islam': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'إسلامي': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'إسلامية': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'اسلامي': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'اسلامية': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'quran': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'قرآن': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
  'religious': { name: 'Islamic', code: 'islamic', flagUrl: 'https://flagcdn.com/w80/sa.png', priority: 22 },
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
  'cz': { name: 'Czech Republic', code: 'cz', flagUrl: 'https://flagcdn.com/w80/cz.png', priority: 98 },
  'czech': { name: 'Czech Republic', code: 'cz', flagUrl: 'https://flagcdn.com/w80/cz.png', priority: 98 },
  'hu': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 99 },
  'hungary': { name: 'Hungary', code: 'hu', flagUrl: 'https://flagcdn.com/w80/hu.png', priority: 99 },
  'ro': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 100 },
  'romania': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 100 },
  'romanian': { name: 'Romania', code: 'ro', flagUrl: 'https://flagcdn.com/w80/ro.png', priority: 100 },
  'si': { name: 'Slovenia', code: 'si', flagUrl: 'https://flagcdn.com/w80/si.png', priority: 101 },
  'slovenia': { name: 'Slovenia', code: 'si', flagUrl: 'https://flagcdn.com/w80/si.png', priority: 101 },
  'hr': { name: 'Croatia', code: 'hr', flagUrl: 'https://flagcdn.com/w80/hr.png', priority: 102 },
  'croatia': { name: 'Croatia', code: 'hr', flagUrl: 'https://flagcdn.com/w80/hr.png', priority: 102 },
  'rs': { name: 'Serbia', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 103 },
  'serbia': { name: 'Serbia', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 103 },
  'ba': { name: 'Bosnia', code: 'ba', flagUrl: 'https://flagcdn.com/w80/ba.png', priority: 104 },
  'bosnia': { name: 'Bosnia', code: 'ba', flagUrl: 'https://flagcdn.com/w80/ba.png', priority: 104 },
  'me': { name: 'Montenegro', code: 'me', flagUrl: 'https://flagcdn.com/w80/me.png', priority: 105 },
  'montenegro': { name: 'Montenegro', code: 'me', flagUrl: 'https://flagcdn.com/w80/me.png', priority: 105 },
  'mk': { name: 'North Macedonia', code: 'mk', flagUrl: 'https://flagcdn.com/w80/mk.png', priority: 106 },
  'macedonia': { name: 'North Macedonia', code: 'mk', flagUrl: 'https://flagcdn.com/w80/mk.png', priority: 106 },
  'al': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 107 },
  'albania': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 107 },
  'alb': { name: 'Albania', code: 'al', flagUrl: 'https://flagcdn.com/w80/al.png', priority: 107 },
  'xk': { name: 'Kosovo', code: 'xk', flagUrl: 'https://flagcdn.com/w80/xk.png', priority: 108 },
  'kosovo': { name: 'Kosovo', code: 'xk', flagUrl: 'https://flagcdn.com/w80/xk.png', priority: 108 },
  // Balkan as a region (use Serbia flag as representative)
  'balkan': { name: 'Balkan', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 109 },
  'balkans': { name: 'Balkan', code: 'rs', flagUrl: 'https://flagcdn.com/w80/rs.png', priority: 109 },
  // Additional countries
  'am': { name: 'Armenia', code: 'am', flagUrl: 'https://flagcdn.com/w80/am.png', priority: 110 },
  'armenia': { name: 'Armenia', code: 'am', flagUrl: 'https://flagcdn.com/w80/am.png', priority: 110 },
  'az': { name: 'Azerbaijan', code: 'az', flagUrl: 'https://flagcdn.com/w80/az.png', priority: 111 },
  'azerbaijan': { name: 'Azerbaijan', code: 'az', flagUrl: 'https://flagcdn.com/w80/az.png', priority: 111 },
  'bg': { name: 'Bulgaria', code: 'bg', flagUrl: 'https://flagcdn.com/w80/bg.png', priority: 112 },
  'bulgaria': { name: 'Bulgaria', code: 'bg', flagUrl: 'https://flagcdn.com/w80/bg.png', priority: 112 },
  'ge': { name: 'Georgia', code: 'ge', flagUrl: 'https://flagcdn.com/w80/ge.png', priority: 113 },
  'georgia': { name: 'Georgia', code: 'ge', flagUrl: 'https://flagcdn.com/w80/ge.png', priority: 113 },
  'sk': { name: 'Slovakia', code: 'sk', flagUrl: 'https://flagcdn.com/w80/sk.png', priority: 114 },
  'slovakia': { name: 'Slovakia', code: 'sk', flagUrl: 'https://flagcdn.com/w80/sk.png', priority: 114 },
  'lt': { name: 'Lithuania', code: 'lt', flagUrl: 'https://flagcdn.com/w80/lt.png', priority: 115 },
  'lithuania': { name: 'Lithuania', code: 'lt', flagUrl: 'https://flagcdn.com/w80/lt.png', priority: 115 },
  'lv': { name: 'Latvia', code: 'lv', flagUrl: 'https://flagcdn.com/w80/lv.png', priority: 116 },
  'latvia': { name: 'Latvia', code: 'lv', flagUrl: 'https://flagcdn.com/w80/lv.png', priority: 116 },
  'ee': { name: 'Estonia', code: 'ee', flagUrl: 'https://flagcdn.com/w80/ee.png', priority: 117 },
  'estonia': { name: 'Estonia', code: 'ee', flagUrl: 'https://flagcdn.com/w80/ee.png', priority: 117 },
  'cy': { name: 'Cyprus', code: 'cy', flagUrl: 'https://flagcdn.com/w80/cy.png', priority: 118 },
  'cyprus': { name: 'Cyprus', code: 'cy', flagUrl: 'https://flagcdn.com/w80/cy.png', priority: 118 },
  'mt': { name: 'Malta', code: 'mt', flagUrl: 'https://flagcdn.com/w80/mt.png', priority: 119 },
  'malta': { name: 'Malta', code: 'mt', flagUrl: 'https://flagcdn.com/w80/mt.png', priority: 119 },
  'is': { name: 'Iceland', code: 'is', flagUrl: 'https://flagcdn.com/w80/is.png', priority: 120 },
  'iceland': { name: 'Iceland', code: 'is', flagUrl: 'https://flagcdn.com/w80/is.png', priority: 120 },
  'lu': { name: 'Luxembourg', code: 'lu', flagUrl: 'https://flagcdn.com/w80/lu.png', priority: 121 },
  'luxembourg': { name: 'Luxembourg', code: 'lu', flagUrl: 'https://flagcdn.com/w80/lu.png', priority: 121 },
  'md': { name: 'Moldova', code: 'md', flagUrl: 'https://flagcdn.com/w80/md.png', priority: 122 },
  'moldova': { name: 'Moldova', code: 'md', flagUrl: 'https://flagcdn.com/w80/md.png', priority: 122 },
  'by': { name: 'Belarus', code: 'by', flagUrl: 'https://flagcdn.com/w80/by.png', priority: 123 },
  'belarus': { name: 'Belarus', code: 'by', flagUrl: 'https://flagcdn.com/w80/by.png', priority: 123 },
  'kz': { name: 'Kazakhstan', code: 'kz', flagUrl: 'https://flagcdn.com/w80/kz.png', priority: 124 },
  'kazakhstan': { name: 'Kazakhstan', code: 'kz', flagUrl: 'https://flagcdn.com/w80/kz.png', priority: 124 },
  'uz': { name: 'Uzbekistan', code: 'uz', flagUrl: 'https://flagcdn.com/w80/uz.png', priority: 125 },
  'uzbekistan': { name: 'Uzbekistan', code: 'uz', flagUrl: 'https://flagcdn.com/w80/uz.png', priority: 125 },
  'np': { name: 'Nepal', code: 'np', flagUrl: 'https://flagcdn.com/w80/np.png', priority: 126 },
  'nepal': { name: 'Nepal', code: 'np', flagUrl: 'https://flagcdn.com/w80/np.png', priority: 126 },
  'mm': { name: 'Myanmar', code: 'mm', flagUrl: 'https://flagcdn.com/w80/mm.png', priority: 127 },
  'myanmar': { name: 'Myanmar', code: 'mm', flagUrl: 'https://flagcdn.com/w80/mm.png', priority: 127 },
  'kh': { name: 'Cambodia', code: 'kh', flagUrl: 'https://flagcdn.com/w80/kh.png', priority: 128 },
  'cambodia': { name: 'Cambodia', code: 'kh', flagUrl: 'https://flagcdn.com/w80/kh.png', priority: 128 },
  'la': { name: 'Laos', code: 'la', flagUrl: 'https://flagcdn.com/w80/la.png', priority: 129 },
  'laos': { name: 'Laos', code: 'la', flagUrl: 'https://flagcdn.com/w80/la.png', priority: 129 },
  'mn': { name: 'Mongolia', code: 'mn', flagUrl: 'https://flagcdn.com/w80/mn.png', priority: 130 },
  'mongolia': { name: 'Mongolia', code: 'mn', flagUrl: 'https://flagcdn.com/w80/mn.png', priority: 130 },
  'cu': { name: 'Cuba', code: 'cu', flagUrl: 'https://flagcdn.com/w80/cu.png', priority: 131 },
  'cuba': { name: 'Cuba', code: 'cu', flagUrl: 'https://flagcdn.com/w80/cu.png', priority: 131 },
  'uy': { name: 'Uruguay', code: 'uy', flagUrl: 'https://flagcdn.com/w80/uy.png', priority: 132 },
  'uruguay': { name: 'Uruguay', code: 'uy', flagUrl: 'https://flagcdn.com/w80/uy.png', priority: 132 },
  'ec': { name: 'Ecuador', code: 'ec', flagUrl: 'https://flagcdn.com/w80/ec.png', priority: 133 },
  'ecuador': { name: 'Ecuador', code: 'ec', flagUrl: 'https://flagcdn.com/w80/ec.png', priority: 133 },
  'cr': { name: 'Costa Rica', code: 'cr', flagUrl: 'https://flagcdn.com/w80/cr.png', priority: 134 },
  'costa rica': { name: 'Costa Rica', code: 'cr', flagUrl: 'https://flagcdn.com/w80/cr.png', priority: 134 },
  'et': { name: 'Ethiopia', code: 'et', flagUrl: 'https://flagcdn.com/w80/et.png', priority: 135 },
  'ethiopia': { name: 'Ethiopia', code: 'et', flagUrl: 'https://flagcdn.com/w80/et.png', priority: 135 },
  'tz': { name: 'Tanzania', code: 'tz', flagUrl: 'https://flagcdn.com/w80/tz.png', priority: 136 },
  'tanzania': { name: 'Tanzania', code: 'tz', flagUrl: 'https://flagcdn.com/w80/tz.png', priority: 136 },
  'ug': { name: 'Uganda', code: 'ug', flagUrl: 'https://flagcdn.com/w80/ug.png', priority: 137 },
  'uganda': { name: 'Uganda', code: 'ug', flagUrl: 'https://flagcdn.com/w80/ug.png', priority: 137 },
  'sn': { name: 'Senegal', code: 'sn', flagUrl: 'https://flagcdn.com/w80/sn.png', priority: 138 },
  'senegal': { name: 'Senegal', code: 'sn', flagUrl: 'https://flagcdn.com/w80/sn.png', priority: 138 },
  'cm': { name: 'Cameroon', code: 'cm', flagUrl: 'https://flagcdn.com/w80/cm.png', priority: 139 },
  'cameroon': { name: 'Cameroon', code: 'cm', flagUrl: 'https://flagcdn.com/w80/cm.png', priority: 139 },
  'ci': { name: 'Ivory Coast', code: 'ci', flagUrl: 'https://flagcdn.com/w80/ci.png', priority: 140 },
  'ivory coast': { name: 'Ivory Coast', code: 'ci', flagUrl: 'https://flagcdn.com/w80/ci.png', priority: 140 },
  'kurdish': { name: 'Kurdish', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 141 },
  'kurd': { name: 'Kurdish', code: 'iq', flagUrl: 'https://flagcdn.com/w80/iq.png', priority: 141 },
  'latino': { name: 'Latino', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 142 },
  'latin': { name: 'Latin', code: 'mx', flagUrl: 'https://flagcdn.com/w80/mx.png', priority: 142 },
  'caribbean': { name: 'Caribbean', code: 'jm', flagUrl: 'https://flagcdn.com/w80/jm.png', priority: 143 },
  'african': { name: 'African', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 144 },
  'africa': { name: 'Africa', code: 'za', flagUrl: 'https://flagcdn.com/w80/za.png', priority: 144 },
  'scandinavian': { name: 'Scandinavian', code: 'se', flagUrl: 'https://flagcdn.com/w80/se.png', priority: 145 },
};

// Merged all countries (not including streaming services - checked separately)
const ALL_COUNTRIES = { ...ARABIC_COUNTRIES, ...USA_ENTRY, ...OTHER_COUNTRIES };

// All categories including streaming services
const ALL_CATEGORIES = { ...STREAMING_SERVICES, ...ALL_COUNTRIES };

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

// Get country info from group name
export const getCountryInfo = (group: string): CountryInfo | null => {
  const groupLower = group.toLowerCase().trim();

  // FIRST: Check for streaming services - they should NEVER match as countries
  const streamingService = getStreamingServiceInfo(group);
  if (streamingService) {
    return streamingService;
  }

  // Direct match for countries
  if (ALL_COUNTRIES[groupLower]) {
    return ALL_COUNTRIES[groupLower];
  }

  // Check if any key (including Arabic text) appears as a substring in the group name
  // Sort by key length descending to match longer/more specific keys first
  const sortedCountryKeys = Object.keys(ALL_COUNTRIES).sort((a, b) => b.length - a.length);
  
  // Check for full country name matches FIRST (before partial matching)
  for (const [key, info] of Object.entries(ALL_COUNTRIES)) {
    if (groupLower === info.name.toLowerCase()) {
      return info;
    }
  }

  // Check if group starts with country code (e.g., "US | News", "AR: Sports")
  const codeMatch = groupLower.match(/^([a-z]{2})[\s|:\-]/);
  if (codeMatch && ALL_COUNTRIES[codeMatch[1]]) {
    return ALL_COUNTRIES[codeMatch[1]];
  }

  // Check if country name/key appears in group name
  // For Arabic keys, use simple substring matching (word boundaries don't work for Arabic)
  // For Latin keys, use word boundary matching
  for (const key of sortedCountryKeys) {
    const info = ALL_COUNTRIES[key];
    const isArabic = /[\u0600-\u06FF]/.test(key);
    
    if (isArabic) {
      // Arabic: simple substring match
      if (groupLower.includes(key) || group.includes(key)) {
        return info;
      }
    } else {
      // Latin: word boundary match
      const countryName = info.name.toLowerCase();
      const nameRegex = new RegExp(`\\b${countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (nameRegex.test(groupLower)) {
        return info;
      }
      if (key.length >= 3) {
        const keyRegex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (keyRegex.test(groupLower)) {
          return info;
        }
      }
    }
  }

  // For 2-letter codes, only match at start or after separator
  const twoLetterMatch = groupLower.match(/^([a-z]{2})(?:\s|$|[|:\-])/);
  if (twoLetterMatch && ALL_COUNTRIES[twoLetterMatch[1]]) {
    return ALL_COUNTRIES[twoLetterMatch[1]];
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
  if (countryInfo) {
    return countryInfo.name;
  }
  // Capitalize first letter of each word for non-country groups
  // Handle pipe-separated names like "alb | gjeneral" -> "Alb | Gjeneral"
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
    'kids jlkids': 'Arabic Kids',
    'jlkids': 'Arabic Kids',
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
