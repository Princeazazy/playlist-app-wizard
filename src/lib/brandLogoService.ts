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
// Wikipedia Commons / English Wikipedia (stable redirect by filename; avoids broken thumb hash paths)
const wikiRedirect = (host: 'commons.wikimedia.org' | 'en.wikipedia.org', pathOrFile: string) => {
  const rawFile = pathOrFile.split('/')[2] || pathOrFile;
  const file = decodeURIComponent(rawFile);
  return `https://${host}/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=512`;
};
const WC = (pathOrFile: string) => wikiRedirect('commons.wikimedia.org', pathOrFile);
const WE = (pathOrFile: string) => wikiRedirect('en.wikipedia.org', pathOrFile);
// Clearbit logo CDN (fallback for brands without a stable Wikipedia logo)
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
  'sky cinema': { logo: '/images/sky-movies-round-logo.png', aliases: ['skycinema', 'sky movies', 'sky cinema movies'] },
  'sky sports': { logo: CB('skysports.com'), aliases: ['skysports', 'سكاي سبورت'] },
  'sky sports f1': { logo: CB('skysports.com'), aliases: ['sky f1'] },
  'sky news': { logo: CB('news.sky.com'), aliases: ['sky news arabia', 'سكاي نيوز'] },
  'sky entertainment': { logo: '/images/sky-entertainment-round-logo.png', aliases: ['sky one', 'sky atlantic', 'sky showcase', 'sky comedy', 'sky witness', 'sky max'] },
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
  mlb: { logo: WC('a/a6/Major_League_Baseball_logo.svg/512px-Major_League_Baseball_logo.svg.png'), aliases: ['mlb network', 'us milb', 'milb', 'minor league baseball'] },
  motogp: { logo: CB('motogp.com'), aliases: ['moto gp'] },
  nascar: { logo: CB('nascar.com'), aliases: [] },
  'national league': { logo: '/images/national-league-logo.png', aliases: ['vanarama national league', 'efl national'] },
  'pdc': { logo: WC('World_Series_of_Darts_-_Logo.svg'), aliases: ['pdc darts', 'darts', 'professional darts corporation', 'world darts'] },
  cricket: { logo: WE('International_Cricket_Council_Logo.svg'), aliases: ['icc', 'world cricket'] },
  rugby: { logo: WE('World_Rugby_logo.svg'), aliases: ['world rugby', 'six nations'] },
  tennis: { logo: WE('ATP_Tour_logo.svg'), aliases: ['atp', 'wta', 'tennis channel'] },
  golf: { logo: WE('PGA_Tour_logo.svg'), aliases: ['pga', 'pga tour', 'european tour'] },
  boxing: { logo: WC('World_Boxing_Council_logo.svg'), aliases: ['wbc', 'boxing channel'] },

  // ── Arab Networks & Platforms ──
  'bein sports': { logo: '/images/bein-logo.png', aliases: ['bein', 'bein sport', 'بي ان سبورت', 'بين سبورت', 'بي ان', 'بين', 'beinsports'] },
  shahid: { logo: '/images/shahid-logo.png?v=2', aliases: ['shahid vip', 'شاهد', 'شاهد فيب'] },
  mbc: { logo: '/images/mbc-logo.png', aliases: ['mbc hd', 'ام بي سي', 'إم بي سي'] },
  osn: { logo: '/images/osn-logo.png', aliases: ['osn+', 'او اس ان', 'أو إس إن'] },
  rotana: { logo: '/images/rotana-logo.png', aliases: ['روتانا'] },
  'al jazeera': { logo: '/images/aljazeera-logo.png', aliases: ['الجزيرة', 'aljazeera', 'jazeera', 'al jazeera english', 'al jazeera arabic', 'aje', 'ajn', 'al jazeera news'] },
  'al jazeera mubasher': { logo: WC('Aljazeera_mubasher_logo.png'), aliases: ['الجزيرة مباشر', 'mubasher'] },
  'al arabiya': { logo: WC('Al-Arabiya_new_logo.svg'), aliases: ['العربية', 'alarabiya'] },
  'al hadath': { logo: WC('AlHADATH.png'), aliases: ['الحدث'] },
  'al mayadeen': { logo: WC('Al-Mayadeen_logo.svg'), aliases: ['الميادين'] },
  'sky news arabia': { logo: CB('skynewsarabia.com'), aliases: ['سكاي نيوز عربية'] },
  dmc: { logo: CB('dmc.eg'), aliases: ['دي ام سي'] },
  ontv: { logo: CB('ontvegypt.tv'), aliases: ['on tv', 'on e', 'اون تي في'] },
  cbc: { logo: CB('cbc-eg.com'), aliases: ['سي بي سي'] },
  'al nahar': { logo: CB('alnaharegypt.com'), aliases: ['النهار'] },
  ssc: { logo: WC('Saudi_Sports_Company_logo.svg'), aliases: ['ssc sports', 'saudi sports', 'ssc1', 'ssc2', 'ssc3', 'ssc4', 'ssc5'] },
  'abu dhabi': { logo: WC('5/5c/Abu_Dhabi_TV_logo.svg/512px-Abu_Dhabi_TV_logo.svg.png'), aliases: ['ad sports', 'abu dhabi sports', 'abu dhabi tv', 'أبوظبي', 'ابوظبي'] },
  dubai: { logo: WC('4/45/Dubai_TV_logo.svg/512px-Dubai_TV_logo.svg.png'), aliases: ['dubai tv', 'dubai sports', 'دبي'] },

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
  'serie a': { logo: WC('Serie_A_logo_2022.svg'), aliases: ['سيري ا', 'الدوري الايطالي', 'seriea', 'serie a tim'] },
  bundesliga: { logo: '/images/bundesliga-logo.png', aliases: ['بوندسليغا', 'الدوري الالماني'] },
  'ligue 1': { logo: CB('ligue1.com'), aliases: ['ligue1', 'الدوري الفرنسي'] },
  'league one': { logo: '/images/league-one-logo-v2.png', aliases: ['league 1', 'efl league one', 'efl league 1', 'efl1', 'الدوري الأول'] },
  'league two': { logo: '/images/league-two-logo-v2.png', aliases: ['league 2', 'efl league two', 'efl league 2', 'efl2', 'الدوري الثاني'] },

  // ── General TV Networks ──
  bbc: { logo: WC('6/62/BBC_Logo_2021.svg/512px-BBC_Logo_2021.svg.png'), aliases: ['bbc one', 'bbc two', 'bbc three', 'bbc four', 'bbc world', 'bbc general', 'بي بي سي'] },
  itv: { logo: WC('4/4d/ITV_logo_2019.svg/512px-ITV_logo_2019.svg.png'), aliases: ['itv1', 'itv2', 'itv3', 'itv4', 'itvx'] },
  'channel 4': { logo: WC('c/c1/Channel_4_logo_2015.svg/512px-Channel_4_logo_2015.svg.png'), aliases: ['ch4', 'c4', 'e4', 'film4', 'more4'] },
  'channel 5': { logo: WC('1/16/Channel_5_%282016%29.svg/512px-Channel_5_%282016%29.svg.png'), aliases: ['ch5', 'c5'] },
  cnn: { logo: WC('b/b1/CNN.svg/512px-CNN.svg.png'), aliases: ['سي ان ان'] },
  msnbc: { logo: WC('1/14/MSNBC_logo_%282021%29.svg/512px-MSNBC_logo_%282021%29.svg.png'), aliases: [] },
  'fox news': { logo: WC('6/67/Fox_News_Channel_logo.svg/512px-Fox_News_Channel_logo.svg.png'), aliases: ['fox news channel'] },
  nbc: { logo: '/images/nbc-round-logo.png', aliases: ['nbc news'] },
  cbs: { logo: WC('4/4f/CBS_logo_%282020%29.svg/512px-CBS_logo_%282020%29.svg.png'), aliases: ['cbs news'] },
  abc: { logo: WC('8/8e/American_Broadcasting_Company_Logo.svg/512px-American_Broadcasting_Company_Logo.svg.png'), aliases: ['abc news'] },
  fox: { logo: '/images/fox-round-logo.svg', aliases: ['fox network'] },
  'comedy central': { logo: WC('a/aa/Comedy_Central_2018.svg/512px-Comedy_Central_2018.svg.png'), aliases: ['comedycentral'] },
  mtv: { logo: WC('6/6e/MTV-2021.svg/512px-MTV-2021.svg.png'), aliases: ['mtv music', 'mtv hits', 'mtv classic'] },
  vh1: { logo: WC('e/e7/VH1_logonew.svg/512px-VH1_logonew.svg.png'), aliases: [] },
  bet: { logo: WC('5/5b/BET_logo_%282021%29.svg/512px-BET_logo_%282021%29.svg.png'), aliases: ['black entertainment television'] },
  'cartoon network': { logo: WC('8/80/Cartoon_Network_2010_logo.svg/512px-Cartoon_Network_2010_logo.svg.png'), aliases: ['cn', 'cartoonnetwork'] },
  boomerang: { logo: WC('5/52/Boomerang_2014_logo.svg/512px-Boomerang_2014_logo.svg.png'), aliases: [] },
  nickelodeon: { logo: '/images/nickelodeon-round-logo.png', aliases: ['nick', 'nick jr', 'nicktoons', 'nickelodeon kids'] },
  discovery: { logo: '/images/discovery-round-logo.svg', aliases: ['discovery channel'] },
  history: { logo: WC('9/91/History_Logo.svg/512px-History_Logo.svg.png'), aliases: ['history channel', 'history hd'] },
  'national geographic': { logo: WC('f/fc/Natgeologo.svg/512px-Natgeologo.svg.png'), aliases: ['nat geo', 'natgeo', 'ngc', 'nat geo wild', 'nat geo people'] },
  'animal planet': { logo: WC('5/54/2018_Animal_Planet_logo.svg/512px-2018_Animal_Planet_logo.svg.png'), aliases: [] },
  'tlc': { logo: WC('7/74/TLC_Logo.svg/512px-TLC_Logo.svg.png'), aliases: [] },
  'investigation discovery': { logo: WC('c/c1/Investigation_Discovery_Logo_2018.svg/512px-Investigation_Discovery_Logo_2018.svg.png'), aliases: ['id channel'] },
  'amc': { logo: WC('1/16/AMC_logo_2016.svg/512px-AMC_logo_2016.svg.png'), aliases: ['amc+'] },
  'a&e': { logo: WC('a/ad/A%26E_Network_logo.svg/512px-A%26E_Network_logo.svg.png'), aliases: ['ae', 'a & e', 'a and e', 'ae network', 'aetv'] },
  syfy: { logo: WC('f/f9/Syfy.svg/512px-Syfy.svg.png'), aliases: ['sci fi channel'] },
  bravo: { logo: WC('8/8c/Bravo_2017.svg/512px-Bravo_2017.svg.png'), aliases: [] },
  hgtv: { logo: WC('1/1e/HGTV_US_Logo_2015.svg/512px-HGTV_US_Logo_2015.svg.png'), aliases: [] },
  'food network': { logo: WC('4/4e/Food_Network_logo.svg/512px-Food_Network_logo.svg.png'), aliases: [] },
  lifetime: { logo: WC('1/1d/Logo_Lifetime_2020.svg/512px-Logo_Lifetime_2020.svg.png'), aliases: [] },
  tnt: { logo: WC('1/1a/TNT_Logo_2016.svg/512px-TNT_Logo_2016.svg.png'), aliases: ['tnt drama'] },
  tbs: { logo: WC('d/de/TBS_logo_2016.svg/512px-TBS_logo_2016.svg.png'), aliases: [] },
  usa: { logo: WC('d/d4/USA_Network_logo_%282016%29.svg/512px-USA_Network_logo_%282016%29.svg.png'), aliases: ['usa network'] },
  pbs: { logo: '/images/pbs-round-logo.png', aliases: ['pbs kids'] },
  'american heroes': { logo: '/images/american-heroes-round-logo.svg', aliases: ['ahc', 'american heroes channel'] },
  'science channel': { logo: WC('5/5a/Science_2017.svg/512px-Science_2017.svg.png'), aliases: ['science', 'sci channel'] },
  smithsonian: { logo: WC('5/55/Smithsonian_Channel_logo.svg/512px-Smithsonian_Channel_logo.svg.png'), aliases: ['smithsonian channel'] },
  'crime + investigation': { logo: WC('0/0e/Crime_%2B_Investigation_logo.svg/512px-Crime_%2B_Investigation_logo.svg.png'), aliases: ['crime investigation', 'c&i', 'crime and investigation'] },
  'travel channel': { logo: WC('f/f3/Travel_Channel_-_Logo_2018.svg/512px-Travel_Channel_-_Logo_2018.svg.png'), aliases: ['travel'] },
  hallmark: { logo: WC('5/5f/Hallmark_Channel.svg/512px-Hallmark_Channel.svg.png'), aliases: ['hallmark channel', 'hallmark movies'] },
  motortrend: { logo: WC('1/1c/MotorTrend_logo.svg/512px-MotorTrend_logo.svg.png'), aliases: ['motor trend', 'velocity'] },
  cinemax: { logo: WC('6/61/Cinemax_%28Yellow%29.svg/512px-Cinemax_%28Yellow%29.svg.png'), aliases: ['max cinema'] },
  fxx: { logo: WC('3/3d/FXX_logo.svg/512px-FXX_logo.svg.png'), aliases: ['fx', 'fx network'] },
  'fox sports 1': { logo: WC('9/91/2015_Fox_Sports_1_logo.svg/512px-2015_Fox_Sports_1_logo.svg.png'), aliases: ['fs1', 'fox sports1'] },
  ion: { logo: WC('5/5f/Ion_Television_2022.svg/512px-Ion_Television_2022.svg.png'), aliases: ['ion television'] },
  'we tv': { logo: WC('1/1d/We_tv_2019.svg/512px-We_tv_2019.svg.png'), aliases: ['wetv'] },
  ovation: { logo: CB('ovationtv.com'), aliases: [] },
  oxygen: { logo: WC('1/14/Oxygen_True_Crime_logo_2017.svg/512px-Oxygen_True_Crime_logo_2017.svg.png'), aliases: ['oxygen true crime'] },
  reelz: { logo: CB('reelz.com'), aliases: [] },
  fyi: { logo: WC('a/a8/FYI_logo.svg/512px-FYI_logo.svg.png'), aliases: [] },
  'cooking channel': { logo: WC('6/67/Cooking_Channel_logo_2017.svg/512px-Cooking_Channel_logo_2017.svg.png'), aliases: [] },
  'great american': { logo: CB('greatamericanmedia.com'), aliases: ['gac', 'gac family', 'great american family'] },
  qvc: { logo: WC('4/4e/QVC_logo_2015.svg/512px-QVC_logo_2015.svg.png'), aliases: [] },
  hsn: { logo: WC('e/e2/HSN_logo.svg/512px-HSN_logo.svg.png'), aliases: [] },
  'cbs sports network': { logo: WC('6/6e/CBS_Sports_Network_logo_2016.svg/512px-CBS_Sports_Network_logo_2016.svg.png'), aliases: ['cbssn'] },
  'big ten network': { logo: '/images/big-ten-round-logo.svg', aliases: ['big ten', 'btn', 'us btn'] },
  'sec network': { logo: WC('1/1c/SEC_Network_logo.svg/512px-SEC_Network_logo.svg.png'), aliases: ['sec'] },
  'acc network': { logo: WC('5/5e/ACC_Network_logo.svg/512px-ACC_Network_logo.svg.png'), aliases: ['accn', 'acc'] },
  'mlb network': { logo: WC('3/3d/MLB_Network_logo.svg/512px-MLB_Network_logo.svg.png'), aliases: ['mlbn'] },
  'nfl network': { logo: WC('8/81/NFL_Network_logo.svg/512px-NFL_Network_logo.svg.png'), aliases: ['nfln'] },
  'nhl network': { logo: WC('1/13/NHL_Network_logo.svg/512px-NHL_Network_logo.svg.png'), aliases: ['nhln'] },
  'nba tv': { logo: WC('5/57/NBA_TV.svg/512px-NBA_TV.svg.png'), aliases: ['nbatv'] },
  'golf channel': { logo: WC('a/a1/Golf_Channel_logo_2019.svg/512px-Golf_Channel_logo_2019.svg.png'), aliases: [] },
  'tennis channel': { logo: WC('8/87/Tennis_Channel_logo.svg/512px-Tennis_Channel_logo.svg.png'), aliases: [] },
  willow: { logo: CB('willow.tv'), aliases: ['willow cricket'] },
  univision: { logo: '/images/univision-round-logo.svg', aliases: ['univ'] },
  unimas: { logo: '/images/unimas-round-logo.svg', aliases: ['uni mas', 'uni-mas', 'unimás', 'us unimas'] },
  telemundo: { logo: WC('b/bf/Telemundo_logo_2018.svg/512px-Telemundo_logo_2018.svg.png'), aliases: [] },
  'spectrum news': { logo: '/images/spectrum-news-round-logo.svg', aliases: ['spectrum', 'us spectrum', 'us spectrum news'] },
  'the cw': { logo: WC('8/8b/The_CW.svg/512px-The_CW.svg.png'), aliases: ['cw', 'cw network'] },
  cinemania: { logo: '/images/cinemania-round-logo.svg', aliases: ['us cm', 'cinemania'] },
  'alwan entertainment': { logo: '/images/alwan-round-logo.png', aliases: ['alwan', 'alwan ent', 'ألوان', 'الوان'] },
  'us victory': { logo: '/images/us-victory-round-logo.png', aliases: ['victory channel', 'victory', 'us vc', 'us victory channel'] },

  // ── International news ──
  'france 24': { logo: WC('8/84/FRANCE_24_logo.svg/512px-FRANCE_24_logo.svg.png'), aliases: ['france24'] },
  'tf1': { logo: WC('2/2c/Logo_TF1_%282013%29.svg/512px-Logo_TF1_%282013%29.svg.png'), aliases: [] },
  'canal+': { logo: WC('6/6b/Canal%2B.svg/512px-Canal%2B.svg.png'), aliases: ['canal plus', 'canalplus'] },
  'rtl': { logo: WC('1/13/RTL_Television_logo.svg/512px-RTL_Television_logo.svg.png'), aliases: [] },
  'zdf': { logo: WC('c/c1/ZDF_logo.svg/512px-ZDF_logo.svg.png'), aliases: [] },
  'ard': { logo: WC('1/1e/ARD_logo.svg/512px-ARD_logo.svg.png'), aliases: ['das erste'] },
  'rai': { logo: WC('a/a8/Logo_Rai_1_-_2017.svg/512px-Logo_Rai_1_-_2017.svg.png'), aliases: ['rai 1', 'rai 2', 'rai 3'] },
  euronews: { logo: WC('8/8b/Euronews_2022_alternative_logo.svg/512px-Euronews_2022_alternative_logo.svg.png'), aliases: [] },
  bloomberg: { logo: WC('5/55/Bloomberg_logo.svg/512px-Bloomberg_logo.svg.png'), aliases: ['bloomberg tv'] },
  'dw': { logo: WC('4/43/Deutsche_Welle_symbol_2012.svg/512px-Deutsche_Welle_symbol_2012.svg.png'), aliases: ['deutsche welle'] },
  rt: { logo: WC('7/72/RT_logo.svg/512px-RT_logo.svg.png'), aliases: ['russia today'] },
  'i24': { logo: WC('7/7b/I24NEWS_logo.svg/512px-I24NEWS_logo.svg.png'), aliases: ['i24 news'] },

  // ── Themed / category fallbacks (collections that aren't a single brand) ──
  '24/7': { logo: '/images/twenty-four-seven-logo.png', aliases: ['24-7', '247'] },
  latino: { logo: '/images/us-lat-logo.png', aliases: ['hispanic', 'spanish latino', 'us lat', 'us latino', 'lat'] },
  christian: { logo: '/images/christian-logo.png', aliases: ['religious', 'religion', 'faith'] },
  'fifa+': { logo: WC('b/b1/FIFA_logo_without_slogan.svg/512px-FIFA_logo_without_slogan.svg.png'), aliases: ['fifa plus', 'ppv fifa+'] },
  caribbean: { logo: '/images/caribbean-logo.png', aliases: ['caribbiean'] },
  // bosna intentionally omitted — handled by country flag detection so it renders as a full circular flag
  championship: { logo: '/images/championship-logo.png', aliases: ['efl championship', 'english championship'] },
  christmas: { logo: '/images/christmas-logo.png', aliases: ['holiday', 'xmas'] },
  ireland: { logo: WC('4/45/Flag_of_Ireland.svg/512px-Flag_of_Ireland.svg.png'), aliases: ['irish'] },
  portugal: { logo: WC('5/5c/Flag_of_Portugal.svg/512px-Flag_of_Portugal.svg.png'), aliases: ['portuguese'] },
  mauritania: { logo: WC('4/43/Flag_of_Mauritania.svg/512px-Flag_of_Mauritania.svg.png'), aliases: [] },

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
