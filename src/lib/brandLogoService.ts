/**
 * Brand Logo Service
 * 
 * Deterministic, high-confidence matching of known brands/networks/platforms
 * to their official logos. NO guessing, NO random flags.
 * 
 * Priority: Provider logo → Brand match → null (neutral icon fallback)
 */

// High-quality brand logo URLs from public CDNs / Wikipedia Commons
// All URLs are HTTPS, high-resolution, and stable
const BRAND_LOGOS: Record<string, { logo: string; aliases: string[] }> = {
  // ── Streaming Platforms ──
  netflix: {
    logo: '/images/netflix-custom.png',
    aliases: ['نتفلكس', 'نتفليكس', 'nflx'],
  },
  hbo: {
    logo: '/images/hbo-max-custom.png',
    aliases: ['hbo max', 'اتش بي او', 'hbomax'],
  },
  max: {
    logo: '/images/hbo-max-custom.png',
    aliases: ['max tv'],
  },
  'disney+': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/200px-Disney%2B_logo.svg.png',
    aliases: ['disney plus', 'disney', 'ديزني', 'ديزنى'],
  },
  hulu: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Hulu_Logo.svg/200px-Hulu_Logo.svg.png',
    aliases: ['هولو'],
  },
  'amazon prime': {
    logo: '/images/prime-video-custom.png',
    aliases: ['prime video', 'amazon', 'أمازون', 'امازون', 'برايم'],
  },
  'apple tv': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/200px-Apple_TV_Plus_Logo.svg.png',
    aliases: ['apple tv+', 'appletv', 'ابل تي في'],
  },
  paramount: {
    logo: '/images/paramount-plus-custom.png',
    aliases: ['paramount+', 'paramount plus', 'باراماونت'],
  },
  peacock: {
    logo: '/images/peacock-logo.png',
    aliases: ['بيكوك'],
  },
  starz: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Starz_2016.svg/200px-Starz_2016.svg.png',
    aliases: ['starzplay', 'ستارز'],
  },
  showtime: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Showtime.svg/200px-Showtime.svg.png',
    aliases: ['شوتايم'],
  },
  crunchyroll: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Crunchyroll_Logo.png/200px-Crunchyroll_Logo.png',
    aliases: ['كرانشي رول'],
  },
  'pluto tv': {
    logo: '/images/pluto-tv-logo.png',
    aliases: ['pluto', 'بلوتو', 'plutotv'],
  },
  'premier league': {
    logo: '/images/premier-league-logo.png',
    aliases: ['epl', 'بريميير ليغ', 'بريمير ليج', 'الدوري الانجليزي', 'الدوري الإنجليزي'],
  },
  dazn: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/DAZN_logo.svg/200px-DAZN_logo.svg.png',
    aliases: ['دازن'],
  },
  ppv: {
    logo: '/images/ppv-dazn.png',
    aliases: ['pay per view', 'pay-per-view', 'بي بي في'],
  },

  // ── Arab Networks & Platforms ──
  'bein sports': {
    logo: '/images/bein-logo.png',
    aliases: ['bein', 'bein sport', 'بي ان سبورت', 'بين سبورت', 'بي ان', 'بين', 'beinsports'],
  },
  shahid: {
    logo: '/images/shahid-logo.png?v=2',
    aliases: ['shahid vip', 'شاهد', 'شاهد فيب'],
  },
  mbc: {
    logo: '/images/mbc-logo.png',
    aliases: ['mbc hd', 'ام بي سي', 'إم بي سي'],
  },
  osn: {
    logo: '/images/osn-logo.png',
    aliases: ['osn+', 'او اس ان', 'أو إس إن'],
  },
  rotana: {
    logo: '/images/rotana-logo.png',
    aliases: ['روتانا'],
  },

  // ── Sports Networks ──
  espn: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png',
    aliases: ['اي اس بي ان'],
  },
  'sky sports': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Sky_Sports_logo_2020.svg/200px-Sky_Sports_logo_2020.svg.png',
    aliases: ['skysports', 'سكاي سبورت'],
  },
  'fox sports': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Fox_Sports_Logo.svg/200px-Fox_Sports_Logo.svg.png',
    aliases: ['فوكس سبورت'],
  },
  eurosport: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Eurosport_Logo_2015.svg/200px-Eurosport_Logo_2015.svg.png',
    aliases: ['يوروسبورت'],
  },
  'bt sport': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/TNT_Sports_Logo_2023.svg/200px-TNT_Sports_Logo_2023.svg.png',
    aliases: ['tnt sports', 'btsport'],
  },

  // ── Sports Leagues ──
  'la liga': {
    logo: '/images/laliga-logo.png',
    aliases: ['laliga', 'لاليغا', 'لا ليغا'],
  },
  'serie a': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Serie_A_logo_2022.svg/200px-Serie_A_logo_2022.svg.png',
    aliases: ['سيري ا', 'الدوري الايطالي'],
  },
  bundesliga: {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/200px-Bundesliga_logo_%282017%29.svg.png',
    aliases: ['بوندسليغا', 'الدوري الالماني'],
  },
  uefa: {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/UEFA_logo.svg/200px-UEFA_logo.svg.png',
    aliases: ['يويفا', 'champions league', 'دوري الابطال'],
  },
  'league one': {
    logo: '/images/league-one-logo.png',
    aliases: ['efl league one', 'الدوري الأول'],
  },
  'league two': {
    logo: '/images/league-two-logo.png',
    aliases: ['efl league two', 'الدوري الثاني'],
  },

  // ── General TV Networks ──
  bbc: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/200px-BBC_Logo_2021.svg.png',
    aliases: ['bbc one', 'bbc two', 'bbc world', 'بي بي سي'],
  },
  cnn: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/200px-CNN.svg.png',
    aliases: ['سي ان ان'],
  },
  'al jazeera': {
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Aljazeera_eng.svg/200px-Aljazeera_eng.svg.png',
    aliases: ['الجزيرة', 'aljazeera', 'جزيرة'],
  },
  'al arabiya': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Al_Arabiya_logo.svg/200px-Al_Arabiya_logo.svg.png',
    aliases: ['العربية', 'alarabiya'],
  },
  marvel: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Marvel_Logo.svg/200px-Marvel_Logo.svg.png',
    aliases: ['مارفل'],
  },
  'star wars': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Star_Wars_Logo.svg/200px-Star_Wars_Logo.svg.png',
    aliases: ['ستار وورز', 'حرب النجوم'],
  },
  pixar: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Pixar_logo.svg/200px-Pixar_logo.svg.png',
    aliases: ['بكسار', 'بيكسار'],
  },
  wwe: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/WWE_2023_Logo.svg/200px-WWE_2023_Logo.svg.png',
    aliases: ['دبليو دبليو اي'],
  },
  ufc: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/UFC_logo.svg/200px-UFC_logo.svg.png',
    aliases: ['يو اف سي'],
  },
  'formula 1': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/F1.svg/200px-F1.svg.png',
    aliases: ['f1', 'formula1', 'فورمولا'],
  },
};

// Build reverse lookup maps (computed once at module load)
const _exactMap = new Map<string, string>(); // lowercase name → brand key
const _aliasMap = new Map<string, string>(); // lowercase alias → brand key

for (const [brandKey, brandData] of Object.entries(BRAND_LOGOS)) {
  _exactMap.set(brandKey.toLowerCase(), brandKey);
  for (const alias of brandData.aliases) {
    _aliasMap.set(alias.toLowerCase(), brandKey);
  }
}

// All lookup keys sorted by length descending for longest-match-first
const _allKeys = [..._exactMap.keys(), ..._aliasMap.keys()].sort((a, b) => b.length - a.length);

/**
 * Match a name to a known brand logo.
 * Returns the logo URL if a high-confidence match is found, null otherwise.
 * 
 * Matching strategy (deterministic, no AI):
 * 1. Exact match against brand name or alias
 * 2. Contains match (longest-first) with word-boundary awareness
 * 3. null if no confident match
 */
export function matchBrandLogo(name: string): string | null {
  if (!name || name.trim().length === 0) return null;

  const normalized = name.toLowerCase().trim();

  // 1. Exact match
  const exactBrand = _exactMap.get(normalized) || _aliasMap.get(normalized);
  if (exactBrand) return BRAND_LOGOS[exactBrand].logo;

  // 2. Contains match - longest key first to avoid partial mismatches
  for (const key of _allKeys) {
    const isArabic = /[\u0600-\u06FF]/.test(key);
    if (isArabic) {
      // Arabic: simple substring
      if (normalized.includes(key) || name.includes(key)) {
        const brandKey = _exactMap.get(key) || _aliasMap.get(key);
        if (brandKey) return BRAND_LOGOS[brandKey].logo;
      }
    } else {
      // Latin: word boundary match to avoid "max" matching "maximum"
      // But allow matching inside compound names like "hbomax", "skysports"
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s|:\\-/])${escaped}(?:$|[\\s|:\\-/+])`, 'i');
      const compoundRegex = new RegExp(escaped, 'i');
      
      if (regex.test(normalized) || (key.length >= 4 && compoundRegex.test(normalized))) {
        const brandKey = _exactMap.get(key) || _aliasMap.get(key);
        if (brandKey) return BRAND_LOGOS[brandKey].logo;
      }
    }
  }

  return null;
}

/**
 * Check if a name represents a known brand (without returning the URL).
 */
export function isKnownBrand(name: string): boolean {
  return matchBrandLogo(name) !== null;
}

/**
 * Get the canonical brand name for display purposes.
 */
export function getBrandDisplayName(name: string): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();

  const exactBrand = _exactMap.get(normalized) || _aliasMap.get(normalized);
  if (exactBrand) {
    const entry = BRAND_LOGOS[exactBrand];
    // Return the key in proper case
    return exactBrand.charAt(0).toUpperCase() + exactBrand.slice(1);
  }

  // Contains match
  for (const key of _allKeys) {
    const isArabic = /[\u0600-\u06FF]/.test(key);
    const matches = isArabic
      ? normalized.includes(key) || name.includes(key)
      : new RegExp(`(?:^|[\\s|:\\-/])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s|:\\-/+])`, 'i').test(normalized)
        || (key.length >= 4 && new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(normalized));

    if (matches) {
      const brandKey = _exactMap.get(key) || _aliasMap.get(key);
      if (brandKey) return brandKey.charAt(0).toUpperCase() + brandKey.slice(1);
    }
  }

  return null;
}
