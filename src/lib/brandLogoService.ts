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
// Clearbit logo CDN (reliable for hotlinking, no key needed)
const CB = (domain: string) => `https://logo.clearbit.com/${domain}`;

const BRAND_LOGOS: Record<string, { logo: string; aliases: string[] }> = {
  // ── Streaming Platforms ──
  netflix: { logo: '/images/netflix-custom-v2.png', aliases: ['نتفلكس', 'نتفليكس', 'nflx'] },
  hbo: { logo: '/images/hbo-max-logo.png', aliases: ['hbo max', 'اتش بي او', 'hbomax'] },
  max: { logo: '/images/hbo-max-logo.png', aliases: ['max tv'] },
  'disney+': { logo: CB('disneyplus.com'), aliases: ['disney plus', 'ديزني', 'ديزنى'] },
  'disney channel': { logo: CB('disneychannel.com'), aliases: ['disney xd', 'disney jr', 'disney junior'] },
  hulu: { logo: CB('hulu.com'), aliases: ['هولو'] },
  'amazon prime': { logo: '/images/prime-video-custom-v2.png', aliases: ['prime video', 'amazon', 'amazon prime video', 'أمازون', 'امازون', 'برايم'] },
  'apple tv': { logo: '/images/apple-tv-logo.png', aliases: ['apple tv+', 'appletv', 'apple', 'ابل تي في', 'آبل تي في'] },
  paramount: { logo: '/images/paramount-plus-custom-v2.png', aliases: ['paramount+', 'paramount plus', 'paramountplus', 'باراماونت'] },
  peacock: { logo: '/images/peacock-logo.png', aliases: ['بيكوك'] },
  starz: { logo: '/images/starzplay-logo.png', aliases: ['starzplay', 'ستارز'] },
  jawwy: { logo: '/images/jawwy-logo.png', aliases: ['jawy', 'جوي', 'jawwy tv'] },
  showtime: { logo: CB('sho.com'), aliases: ['شوتايم'] },
  crunchyroll: { logo: CB('crunchyroll.com'), aliases: ['كرانشي رول'] },
  'pluto tv': { logo: '/images/pluto-tv-logo.png', aliases: ['pluto', 'بلوتو', 'plutotv'] },
  'discovery+': { logo: CB('discoveryplus.com'), aliases: ['discovery plus'] },
  tubi: { logo: CB('tubi.tv'), aliases: ['tubitv'] },

  // ── Sky family ──
  'sky cinema': { logo: CB('sky.com'), aliases: ['skycinema', 'sky movies'] },
  'sky sports': { logo: CB('skysports.com'), aliases: ['skysports', 'سكاي سبورت'] },
  'sky sports f1': { logo: CB('skysports.com'), aliases: ['sky f1'] },
  'sky news': { logo: CB('news.sky.com'), aliases: ['sky news arabia', 'سكاي نيوز'] },
  'sky entertainment': { logo: '/images/sky-entertainment-logo.png', aliases: ['sky one', 'sky atlantic', 'sky showcase', 'sky comedy', 'sky witness', 'sky max'] },
  sky: { logo: CB('sky.com'), aliases: ['سكاي'] },

  // ── PPV / Sports networks ──
  'premier league': { logo: '/images/premier-league-logo.png', aliases: ['epl', 'بريميير ليغ', 'بريمير ليج', 'الدوري الانجليزي', 'الدوري الإنجليزي'] },
  dazn: { logo: '/images/ppv-dazn.png', aliases: ['دازن'] },
  ppv: { logo: '/images/ppv-dazn.png', aliases: ['pay per view', 'pay-per-view', 'بي بي في'] },
  'world cup': { logo: '/images/world-cup-logo.png', aliases: ['fifa world cup', 'كأس العالم', 'مونديال', 'mondial'] },
  fifa: { logo: CB('fifa.com'), aliases: ['فيفا'] },
  'champions league': { logo: '/images/champions-league-logo.png', aliases: ['uefa champions league', 'ucl', 'دوري الابطال'] },
  'europa league': { logo: CB('uefa.com'), aliases: ['uel', 'الدوري الأوروبي'] },
  uefa: { logo: '/images/uefa-logo.png', aliases: ['يويفا'] },
  nba: { logo: CB('nba.com'), aliases: ['nba tv', 'الدوري الأمريكي'] },
  nfl: { logo: CB('nfl.com'), aliases: ['nfl network'] },
  nhl: { logo: CB('nhl.com'), aliases: ['nhl network'] },
  mlb: { logo: CB('mlb.com'), aliases: ['mlb network'] },
  motogp: { logo: CB('motogp.com'), aliases: ['moto gp'] },
  nascar: { logo: CB('nascar.com'), aliases: [] },
  'national league': { logo: '/images/national-league-logo.png', aliases: ['vanarama national league', 'efl national'] },
  'pdc': { logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/02/PDC_Darts_logo.svg/512px-PDC_Darts_logo.svg.png', aliases: ['pdc darts', 'darts', 'professional darts corporation', 'world darts'] },
  cricket: { logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/International_Cricket_Council_Logo.svg/512px-International_Cricket_Council_Logo.svg.png', aliases: ['icc', 'world cricket'] },
  rugby: { logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/World_Rugby_logo.svg/512px-World_Rugby_logo.svg.png', aliases: ['world rugby', 'six nations'] },
  tennis: { logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/ATP_Tour_logo.svg/512px-ATP_Tour_logo.svg.png', aliases: ['atp', 'wta', 'tennis channel'] },
  golf: { logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/76/PGA_Tour_logo.svg/512px-PGA_Tour_logo.svg.png', aliases: ['pga', 'pga tour', 'european tour'] },
  boxing: { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/World_Boxing_Council_logo.svg/512px-World_Boxing_Council_logo.svg.png', aliases: ['wbc', 'boxing channel'] },

  // ── Arab Networks & Platforms ──
  'bein sports': { logo: '/images/bein-logo.png', aliases: ['bein', 'bein sport', 'بي ان سبورت', 'بين سبورت', 'بي ان', 'بين', 'beinsports'] },
  shahid: { logo: '/images/shahid-logo.png?v=2', aliases: ['shahid vip', 'شاهد', 'شاهد فيب'] },
  mbc: { logo: '/images/mbc-logo.png', aliases: ['mbc hd', 'ام بي سي', 'إم بي سي'] },
  osn: { logo: '/images/osn-logo.png', aliases: ['osn+', 'او اس ان', 'أو إس إن'] },
  rotana: { logo: '/images/rotana-logo.png', aliases: ['روتانا'] },
  'al jazeera': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Aljazeera.svg/512px-Aljazeera.svg.png', aliases: ['الجزيرة', 'aljazeera', 'jazeera', 'al jazeera english', 'al jazeera arabic', 'aje', 'ajn', 'al jazeera news'] },
  'al jazeera mubasher': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Aljazeera_mubasher_logo.png/512px-Aljazeera_mubasher_logo.png', aliases: ['الجزيرة مباشر', 'mubasher'] },
  'al arabiya': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Al_Arabiya_new_logo.svg/512px-Al_Arabiya_new_logo.svg.png', aliases: ['العربية', 'alarabiya'] },
  'al hadath': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Al-Hadath_TV_Channel_logo.svg/512px-Al-Hadath_TV_Channel_logo.svg.png', aliases: ['الحدث'] },
  'al mayadeen': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Al-Mayadeen_logo.svg/512px-Al-Mayadeen_logo.svg.png', aliases: ['الميادين'] },
  'sky news arabia': { logo: CB('skynewsarabia.com'), aliases: ['سكاي نيوز عربية'] },
  dmc: { logo: CB('dmc.eg'), aliases: ['دي ام سي'] },
  ontv: { logo: CB('ontvegypt.tv'), aliases: ['on tv', 'on e', 'اون تي في'] },
  cbc: { logo: CB('cbc-eg.com'), aliases: ['سي بي سي'] },
  'al nahar': { logo: CB('alnaharegypt.com'), aliases: ['النهار'] },
  ssc: { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Saudi_Sports_Company_logo.svg/512px-Saudi_Sports_Company_logo.svg.png', aliases: ['ssc sports', 'saudi sports', 'ssc1', 'ssc2', 'ssc3', 'ssc4', 'ssc5'] },
  'abu dhabi': { logo: CB('adtv.ae'), aliases: ['ad sports', 'abu dhabi sports', 'أبوظبي', 'ابوظبي'] },
  dubai: { logo: CB('dmi.ae'), aliases: ['dubai tv', 'dubai sports', 'دبي'] },

  // ── Sports Networks ──
  espn: { logo: CB('espn.com'), aliases: ['اي اس بي ان', 'espn+', 'espn2'] },
  'fox sports': { logo: CB('foxsports.com'), aliases: ['فوكس سبورت'] },
  eurosport: { logo: CB('eurosport.com'), aliases: ['يوروسبورت'] },
  'tnt sports': { logo: CB('tntsports.co.uk'), aliases: ['bt sport', 'btsport', 'tnt'] },
  'fubo sports': { logo: CB('fubo.tv'), aliases: ['fubotv', 'fubo'] },
  'cbs sports': { logo: CB('cbssports.com'), aliases: [] },
  'nbc sports': { logo: CB('nbcsports.com'), aliases: [] },

  // ── Sports Leagues ──
  'la liga': { logo: '/images/laliga-logo.png', aliases: ['laliga', 'لاليغا', 'لا ليغا'] },
  'serie a': { logo: CB('legaseriea.it'), aliases: ['سيري ا', 'الدوري الايطالي'] },
  bundesliga: { logo: '/images/bundesliga-logo.png', aliases: ['بوندسليغا', 'الدوري الالماني'] },
  'ligue 1': { logo: CB('ligue1.com'), aliases: ['ligue1', 'الدوري الفرنسي'] },
  'league one': { logo: '/images/league-one-logo-v2.png', aliases: ['league 1', 'efl league one', 'efl league 1', 'efl1', 'الدوري الأول'] },
  'league two': { logo: '/images/league-two-logo-v2.png', aliases: ['league 2', 'efl league two', 'efl league 2', 'efl2', 'الدوري الثاني'] },

  // ── General TV Networks ──
  bbc: { logo: CB('bbc.co.uk'), aliases: ['bbc one', 'bbc two', 'bbc three', 'bbc four', 'bbc world', 'بي بي سي'] },
  itv: { logo: CB('itv.com'), aliases: ['itv1', 'itv2', 'itv3', 'itv4', 'itvx'] },
  'channel 4': { logo: CB('channel4.com'), aliases: ['ch4', 'c4', 'e4', 'film4', 'more4'] },
  'channel 5': { logo: CB('channel5.com'), aliases: ['ch5', 'c5'] },
  cnn: { logo: CB('cnn.com'), aliases: ['سي ان ان'] },
  msnbc: { logo: CB('msnbc.com'), aliases: [] },
  'fox news': { logo: CB('foxnews.com'), aliases: ['fox news channel'] },
  nbc: { logo: CB('nbc.com'), aliases: ['nbc news'] },
  cbs: { logo: CB('cbs.com'), aliases: ['cbs news'] },
  abc: { logo: CB('abc.com'), aliases: ['abc news'] },
  fox: { logo: CB('fox.com'), aliases: ['fxx', 'fx network'] },
  'comedy central': { logo: CB('cc.com'), aliases: ['comedycentral'] },
  mtv: { logo: CB('mtv.com'), aliases: ['mtv music', 'mtv hits', 'mtv classic'] },
  vh1: { logo: CB('vh1.com'), aliases: [] },
  bet: { logo: CB('bet.com'), aliases: ['black entertainment television'] },
  'cartoon network': { logo: CB('cartoonnetwork.com'), aliases: ['cn', 'cartoonnetwork'] },
  boomerang: { logo: CB('boomerang.com'), aliases: [] },
  nickelodeon: { logo: CB('nick.com'), aliases: ['nick', 'nick jr', 'nicktoons'] },
  discovery: { logo: CB('discovery.com'), aliases: ['discovery channel'] },
  history: { logo: CB('history.com'), aliases: ['history channel', 'history hd'] },
  'national geographic': { logo: CB('nationalgeographic.com'), aliases: ['nat geo', 'natgeo', 'ngc', 'nat geo wild', 'nat geo people'] },
  'animal planet': { logo: CB('animalplanet.com'), aliases: [] },
  'tlc': { logo: CB('tlc.com'), aliases: [] },
  'investigation discovery': { logo: CB('investigationdiscovery.com'), aliases: ['id channel'] },
  'amc': { logo: CB('amc.com'), aliases: ['amc+'] },
  'a&e': { logo: CB('aetv.com'), aliases: ['ae network', 'aetv'] },
  syfy: { logo: CB('syfy.com'), aliases: ['sci fi channel'] },
  bravo: { logo: CB('bravotv.com'), aliases: [] },
  hgtv: { logo: CB('hgtv.com'), aliases: [] },
  'food network': { logo: CB('foodnetwork.com'), aliases: [] },
  lifetime: { logo: CB('mylifetime.com'), aliases: [] },
  tnt: { logo: CB('tntdrama.com'), aliases: ['tnt drama'] },
  tbs: { logo: CB('tbs.com'), aliases: [] },
  usa: { logo: CB('usanetwork.com'), aliases: ['usa network'] },
  pbs: { logo: CB('pbs.org'), aliases: ['pbs kids'] },
  'american heroes': { logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/American_Heroes_Channel.png/512px-American_Heroes_Channel.png', aliases: ['ahc', 'american heroes channel'] },
  'science channel': { logo: CB('sciencechannel.com'), aliases: ['science', 'sci channel'] },
  smithsonian: { logo: CB('smithsonianchannel.com'), aliases: ['smithsonian channel'] },
  'crime + investigation': { logo: CB('crimeandinvestigation.co.uk'), aliases: ['crime investigation', 'c&i', 'crime and investigation'] },
  'travel channel': { logo: CB('travelchannel.com'), aliases: ['travel'] },
  hallmark: { logo: CB('hallmarkchannel.com'), aliases: ['hallmark channel', 'hallmark movies'] },
  motortrend: { logo: CB('motortrend.com'), aliases: ['motor trend', 'velocity'] },
  cinemax: { logo: CB('cinemax.com'), aliases: ['max cinema'] },
  fxx: { logo: CB('fxnetworks.com'), aliases: ['fx', 'fx network'] },
  'fox sports 1': { logo: CB('foxsports.com'), aliases: ['fs1', 'fox sports1'] },
  ion: { logo: CB('iontelevision.com'), aliases: ['ion television'] },
  'we tv': { logo: CB('wetv.com'), aliases: ['wetv'] },
  ovation: { logo: CB('ovationtv.com'), aliases: [] },
  oxygen: { logo: CB('oxygen.com'), aliases: ['oxygen true crime'] },
  reelz: { logo: CB('reelz.com'), aliases: [] },
  fyi: { logo: CB('fyi.tv'), aliases: [] },
  'cooking channel': { logo: CB('cookingchanneltv.com'), aliases: [] },
  'great american': { logo: CB('greatamericanmedia.com'), aliases: ['gac', 'gac family', 'great american family'] },
  qvc: { logo: CB('qvc.com'), aliases: [] },
  hsn: { logo: CB('hsn.com'), aliases: [] },
  'cbs sports network': { logo: CB('cbssports.com'), aliases: ['cbssn'] },
  'big ten': { logo: CB('bigten.org'), aliases: ['big ten network', 'btn'] },
  'sec network': { logo: CB('espn.com'), aliases: ['sec'] },
  'acc network': { logo: CB('espn.com'), aliases: ['accn', 'acc'] },
  'mlb network': { logo: CB('mlb.com'), aliases: ['mlbn'] },
  'nfl network': { logo: CB('nfl.com'), aliases: ['nfln'] },
  'nhl network': { logo: CB('nhl.com'), aliases: ['nhln'] },
  'nba tv': { logo: CB('nba.com'), aliases: ['nbatv'] },
  golf: { logo: CB('golfchannel.com'), aliases: ['golf channel'] },
  'tennis channel': { logo: CB('tennischannel.com'), aliases: [] },
  willow: { logo: CB('willow.tv'), aliases: ['willow cricket'] },

  // ── International news ──
  'france 24': { logo: CB('france24.com'), aliases: ['france24'] },
  'tf1': { logo: CB('tf1.fr'), aliases: [] },
  'canal+': { logo: CB('canalplus.com'), aliases: ['canal plus', 'canalplus'] },
  'rtl': { logo: CB('rtl.de'), aliases: [] },
  'zdf': { logo: CB('zdf.de'), aliases: [] },
  'ard': { logo: CB('ard.de'), aliases: ['das erste'] },
  'rai': { logo: CB('rai.it'), aliases: ['rai 1', 'rai 2', 'rai 3'] },
  euronews: { logo: CB('euronews.com'), aliases: [] },
  bloomberg: { logo: CB('bloomberg.com'), aliases: ['bloomberg tv'] },
  'dw': { logo: CB('dw.com'), aliases: ['deutsche welle'] },
  rt: { logo: CB('rt.com'), aliases: ['russia today'] },
  'i24': { logo: CB('i24news.tv'), aliases: ['i24 news'] },

  // ── Brands / labels ──
  marvel: { logo: CB('marvel.com'), aliases: ['مارفل'] },
  'star wars': { logo: CB('starwars.com'), aliases: ['ستار وورز', 'حرب النجوم'] },
  pixar: { logo: CB('pixar.com'), aliases: ['بكسار', 'بيكسار'] },
  dreamworks: { logo: CB('dreamworks.com'), aliases: [] },
  warner: { logo: CB('warnerbros.com'), aliases: ['warner bros', 'wb'] },
  universal: { logo: CB('universalpictures.com'), aliases: ['universal pictures'] },
  wwe: { logo: CB('wwe.com'), aliases: ['دبليو دبليو اي'] },
  ufc: { logo: CB('ufc.com'), aliases: ['يو اف سي'] },
  aew: { logo: CB('allelitewrestling.com'), aliases: ['all elite wrestling'] },
  'formula 1': { logo: CB('formula1.com'), aliases: ['f1', 'formula1', 'فورمولا'] },
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
