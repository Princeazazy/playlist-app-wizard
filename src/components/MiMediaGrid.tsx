import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, Search, Star, Film, User, Cloud, Sun, CloudRain, Snowflake, CloudLightning, Menu, X, Heart } from 'lucide-react';
import { Channel } from '@/hooks/useIPTV';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { useWeather } from '@/hooks/useWeather';
import { useIsMobile } from '@/hooks/use-mobile';
import { translateGroupName } from '@/lib/countryUtils';
import { useTMDBPosters } from '@/hooks/useTMDBPosters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Custom category logos
import englishDubbedMoviesLogo from '@/assets/category-logos/english-dubbed-movies.png';
import arabicDubbedCartoonLogo from '@/assets/category-logos/arabic-dubbed-cartoon.png';
import arabicSubbedCartoonLogo from '@/assets/category-logos/arabic-subbed-cartoon.png';
import foreignSub2000sLogo from '@/assets/category-logos/foreign-subtitled-2000s.png';
import foreignSub2022Logo from '@/assets/category-logos/foreign-subtitled-2022.png';
import foreignSub2023Logo from '@/assets/category-logos/foreign-subtitled-2023.png';
import foreignSub2024Logo from '@/assets/category-logos/foreign-subtitled-2024.png';
import foreignSub2025Logo from '@/assets/category-logos/foreign-subtitled-2025.png';
import foreignSub2026Logo from '@/assets/category-logos/foreign-subtitled-2026.png';
import weekendMoviesLogo from '@/assets/category-logos/weekend-movies.png';
import christmasMoviesLogo from '@/assets/category-logos/christmas-movies.png';
import documentaryMoviesLogo from '@/assets/category-logos/documentary-movies.png';
import indianMoviesLogo from '@/assets/category-logos/indian-movies.png';
import turkishMoviesLogo from '@/assets/category-logos/turkish-movies.png';
import arabicMovies1970s2000sLogo from '@/assets/category-logos/arabic-movies-1970s-2000s.png';
import arabicMovies2023Logo from '@/assets/category-logos/arabic-movies-2023.png';
import arabicMovies2024Logo from '@/assets/category-logos/arabic-movies-2024.png';
import arabicMovies2025Logo from '@/assets/category-logos/arabic-movies-2025.png';
import arabicMovies2026Logo from '@/assets/category-logos/arabic-movies-2026.png';
import movies4kLogo from '@/assets/category-logos/4k-movies.png';
import movies3dLogo from '@/assets/category-logos/3d-movies.png';
import vodGermanyLogo from '@/assets/category-logos/german-vod-movies.png';
import wweLogo from '@/assets/category-logos/wwe-movies.png';
import serUfcLogo from '@/assets/category-logos/ser-ufc.png';
import alPacinoLogo from '@/assets/category-logos/al-pacino-movies.png';
import samirGhanemLogo from '@/assets/category-logos/samir-ghanem-movies.png';
import leonardoDicaprioLogo from '@/assets/category-logos/leonardo-dicaprio-movies.png';
import enComedyLogo from '@/assets/category-logos/en-comedy-movies.png';
import adelImamLogo from '@/assets/category-logos/adel-imam-movies.png';
import theaterPlaysLogo from '@/assets/category-logos/theater-plays-movies.png';
import worldMoviesLogo from '@/assets/category-logos/world-movies.png';
import asiaMoviesLogo from '@/assets/category-logos/asia-movies.png';
import multiLangMoviesLogo from '@/assets/category-logos/multi-lang-movies.png';
import dcMoviesLogo from '@/assets/category-logos/dc-movies.png';
import disneyShortsLogo from '@/assets/category-logos/disney-shorts.png';
import enDramaRomanceLogo from '@/assets/category-logos/en-drama-romance.png';
import enHboAmazonLogo from '@/assets/category-logos/en-hbo-amazon.png';
import enKidsFamilyLogo from '@/assets/category-logos/en-kids-family.png';
import enStarWarsLogo from '@/assets/category-logos/en-star-wars.png';
import formula1Logo from '@/assets/category-logos/formula1-movies.png';
import enNetflixLogo from '@/assets/category-logos/en-netflix.png';
import englishMoviesLogo from '@/assets/category-logos/english-movies.png';
import albaniaMoviesLogo from '@/assets/category-logos/albania-movies.png';

// Series-specific logos
import serArabic2026Logo from '@/assets/category-logos/ser-arabic-2026.png';
import serArabic2025Logo from '@/assets/category-logos/ser-arabic-2025.png';
import serArabic2024Logo from '@/assets/category-logos/ser-arabic-2024.png';
import serArabic2023Logo from '@/assets/category-logos/ser-arabic-2023.png';
import serArabicClassicLogo from '@/assets/category-logos/ser-arabic-classic.png';
import serTurkishLogo from '@/assets/category-logos/ser-turkish.png';
import serIndianLogo from '@/assets/category-logos/ser-indian.png';
import serEnglishLogo from '@/assets/category-logos/ser-english.png';
import serNetflixLogo from '@/assets/category-logos/ser-netflix.png';
import serDocumentaryLogo from '@/assets/category-logos/ser-documentary.png';
import serComedyLogo from '@/assets/category-logos/ser-comedy.png';
import serDramaRomanceLogo from '@/assets/category-logos/ser-drama-romance.png';
import serHboAmazonLogo from '@/assets/category-logos/ser-hbo-amazon.png';
import serKidsFamilyLogo from '@/assets/category-logos/ser-kids-family.png';
import serCartoonLogo from '@/assets/category-logos/ser-cartoon.png';
import serForeignSubLogo from '@/assets/category-logos/ser-foreign-sub.png';
import serDisneyLogo from '@/assets/category-logos/ser-disney.png';
import serEnglishDubbedLogo from '@/assets/category-logos/ser-english-dubbed.png';
import ramadanSeriesLogo from '@/assets/category-logos/ramadan-series.png';
import koreanDramaLogo from '@/assets/category-logos/korean-drama.png';
import animeSeriesLogo from '@/assets/category-logos/anime-series.png';
import actionAdventureLogo from '@/assets/category-logos/action-adventure.png';
import horrorThrillerLogo from '@/assets/category-logos/horror-thriller.png';
import scifiFantasyLogo from '@/assets/category-logos/scifi-fantasy.png';
import crimeMysteryLogo from '@/assets/category-logos/crime-mystery.png';
import historicalBiographyLogo from '@/assets/category-logos/historical-biography.png';
import warMilitaryLogo from '@/assets/category-logos/war-military.png';
import sportsSeriesLogo from '@/assets/category-logos/sports-series.png';
import serTvShowsLogo from '@/assets/category-logos/ser-tv-shows.png';
import serIslamicLogo from '@/assets/category-logos/ser-islamic.png';
import serEnglish2022SubLogo from '@/assets/category-logos/ser-english-2022-sub.png';
import serForeign2023Logo from '@/assets/category-logos/ser-foreign-2023.png';
import serForeign2026Logo from '@/assets/category-logos/ser-foreign-2026.png';
import serRamadanMaghreb2026Logo from '@/assets/category-logos/ser-ramadan-maghreb-2026.png';
import serRamadanEgyptian2026Logo from '@/assets/category-logos/ser-ramadan-egyptian-2026.png';
import serRamadanGulf2026Logo from '@/assets/category-logos/ser-ramadan-gulf-2026.png';
import serRamadanLevantine2026Logo from '@/assets/category-logos/ser-ramadan-levantine-2026.png';
import serAsiaLogo from '@/assets/category-logos/ser-asia.png';
import serWorldLogo from '@/assets/category-logos/ser-world.png';
import serAlbaniaLogo from '@/assets/category-logos/ser-albania.png';
import serSongsLogo from '@/assets/category-logos/ser-songs.png';
import serNowShowingLogo from '@/assets/category-logos/ser-now-showing.png';
import serKoreanLogo from '@/assets/category-logos/ser-korean.png';
import serForeign2024Logo from '@/assets/category-logos/foreign-subtitled-2024.png';
import serForeign2025Logo from '@/assets/category-logos/foreign-subtitled-2025.png';
import serMasrahLogo from '@/assets/category-logos/ser-masrah.png';
import serForeign4kLogo from '@/assets/category-logos/ser-foreign-4k.png';
import serAnimeEnLogo from '@/assets/category-logos/ser-anime-en.png';

// Series-specific category logo matcher
const getSeriesCategoryLogo = (groupName: string): string | null => {
  const g = (groupName + ' ' + translateGroupName(groupName)).toLowerCase();
  
  // Ramadan - Specific Regions
  if (g.includes('ramadan') && (g.includes('egypt') || g.includes('misr') || g.includes('مصر') || g.includes('مصري'))) return serRamadanEgyptian2026Logo;
  if (g.includes('ramadan') && (g.includes('gulf') || g.includes('khaleej') || g.includes('خليج'))) return serRamadanGulf2026Logo;
  if (g.includes('ramadan') && (g.includes('levant') || g.includes('cham') || g.includes('shami') || g.includes('shamy') || g.includes('شامي') || g.includes('شام') || g.includes('سوريا') || g.includes('syria') || g.includes('lebanon') || g.includes('لبنان'))) return serRamadanLevantine2026Logo;
  if (g.includes('ramadan') && (g.includes('maghreb') || g.includes('morocco') || g.includes('مغرب') || g.includes('tunisia') || g.includes('تونس') || g.includes('algeria') || g.includes('جزائر'))) return serRamadanMaghreb2026Logo;
  
  // Generic Ramadan Fallback
  if (g.includes('ramadan') || g.includes('رمضان')) return ramadanSeriesLogo;
  
  // Now Showing / Currently Airing
  if (g.includes('تعرض حاليا') || g.includes('now showing') || g.includes('currently') || g.includes('airing')) return serNowShowingLogo;
  
  // Songs / Music
  if (g.includes('أغاني') || g.includes('اغاني') || g.includes('song') || g.includes('music') || g.includes('clip')) return serSongsLogo;
  
  // TV Shows / Programs
  if (g.includes('tv show') || g.includes('program') || g.includes('برامج')) return serTvShowsLogo;
  
  // Islamic
  if (g.includes('islamic') || g.includes('islam') || g.includes('إسلام') || g.includes('اسلام') || g.includes('اسلامية') || g.includes('ديني') || g.includes('الاسلامية') || g.includes('الإسلامية') || g.includes('ال الاسلامية') || g.includes('ال الإسلامية')) return serIslamicLogo;

  // Foreign/English Subtitled Years (Specific) - also match "bf" (before) and "قبل"
  if ((g.includes('foreign') || g.includes('english') || g.includes('bf') || g.includes('قبل')) && (g.includes('sub') || g.includes('subtitled')) && g.includes('2022')) return serEnglish2022SubLogo;
  if ((g.includes('foreign') || g.includes('english')) && (g.includes('sub') || g.includes('2023'))) return serForeign2023Logo;
  if ((g.includes('foreign') || g.includes('english')) && g.includes('2024')) return serForeign2024Logo;
  if ((g.includes('foreign') || g.includes('english')) && g.includes('2025')) return serForeign2025Logo;
  if ((g.includes('foreign') || g.includes('english')) && (g.includes('sub') || g.includes('2026'))) return serForeign2026Logo;
  
  // Arabic Series by Year
  if ((g.includes('arabic') || g.includes('عربي') || g.includes('arab')) && g.includes('2026')) return serArabic2026Logo;
  if ((g.includes('arabic') || g.includes('عربي') || g.includes('arab')) && g.includes('2025')) return serArabic2025Logo;
  if ((g.includes('arabic') || g.includes('عربي') || g.includes('arab')) && g.includes('2024')) return serArabic2024Logo;
  if ((g.includes('arabic') || g.includes('عربي') || g.includes('arab')) && g.includes('2023')) return serArabic2023Logo;
  if ((g.includes('arabic') || g.includes('عربي') || g.includes('arab')) && (g.includes('197') || g.includes('198') || g.includes('199') || g.includes('200') || g.includes('classic') || g.includes('old') || g.includes('before') || g.includes('قبل'))) return serArabicClassicLogo;

  // Dubbed Foreign series
  if (g.includes('dub') && (g.includes('foreign') || g.includes('مدبلجة'))) return serEnglishDubbedLogo;

  // Foreign Subtitled
  if (g.includes('foreign') && !g.includes('dub')) return serForeignSubLogo;

  // Masrah / Theater Plays (series-specific)
  if (g.includes('masrah') || g.includes('مسرح') || g.includes('مسرحي') || g.includes('مسرحيات') || g.includes('theater') || g.includes('theatre')) return serMasrahLogo;

  // Foreign 4K Series
  if (g.includes('4k') && (g.includes('ser') || g.includes('series') || g.includes('مسلسل'))) return serForeign4kLogo;

  // Cartoons
  if (g.includes('cartoon') || g.includes('كرتون') || g.includes('animation')) return serCartoonLogo;

  // Specific Genres
  if (g.includes('english') && g.includes('dub')) return serEnglishDubbedLogo;
  if (g.includes('documentary') || g.includes('docu') || g.includes('وثائقي')) return serDocumentaryLogo;
  if (g.includes('indian') || g.includes('bollywood') || g.includes('hindi') || g.includes('هندي')) return serIndianLogo;
  if (g.includes('turkish') || g.includes('turk') || g.includes('ترك')) return serTurkishLogo;
  
  // Korean / K-Drama
  if (g.includes('korean') || g.includes('kdrama') || g.includes('k-drama') || g.includes('كوري')) return serKoreanLogo;
  
  // Anime - English anime gets specific logo
  if ((g.includes('anime') || g.includes('anm')) && (g.includes('en') || g.includes('english') || g.includes('انجليزي'))) return serAnimeEnLogo;
  if (g.includes('anime') || g.includes('انمي') || g.includes('أنمي') || g.includes('anm')) return animeSeriesLogo;
  
  // Action / Adventure
  if (g.includes('action') || g.includes('adventure') || g.includes('أكشن') || g.includes('مغامر')) return actionAdventureLogo;
  
  // Horror / Thriller
  if (g.includes('horror') || g.includes('thriller') || g.includes('scary') || g.includes('رعب') || g.includes('إثارة')) return horrorThrillerLogo;
  
  // Sci-Fi / Fantasy
  if (g.includes('sci-fi') || g.includes('scifi') || g.includes('fantasy') || g.includes('خيال')) return scifiFantasyLogo;
  
  // Crime / Mystery
  if (g.includes('crime') || g.includes('mystery') || g.includes('detective') || g.includes('جريمة') || g.includes('غموض')) return crimeMysteryLogo;
  
  // Historical / Biography
  if (g.includes('history') || g.includes('historical') || g.includes('biography') || g.includes('تاريخ') || g.includes('سيرة')) return historicalBiographyLogo;
  
  // War / Military
  if (g.includes('war') || g.includes('military') || g.includes('حرب') || g.includes('عسكري')) return warMilitaryLogo;
  
  // UFC
  if (g.includes('ufc') || (g.includes('عروض') && !g.includes('wwe'))) return serUfcLogo;
  
  // Sports
  if (g.includes('sport') || g.includes('رياض') || g.includes('wwe') || g.includes('wrestling')) return sportsSeriesLogo;
  
  // Comedy
  if (g.includes('comedy') || g.includes('كوميدي') || g.includes('كوميديا')) return serComedyLogo;
  
  // Drama & Romance
  if ((g.includes('drama') || g.includes('romance') || g.includes('رومانسي') || g.includes('دراما'))) return serDramaRomanceLogo;
  
  // HBO / Amazon Prime
  if (g.includes('hbo') || g.includes('amazon') || g.includes('prime')) return serHboAmazonLogo;
  
  // Kids & Family
  if (g.includes('kids') || g.includes('family') || g.includes('اطفال') || g.includes('عائلي') || g.includes('أطفال')) return serKidsFamilyLogo;
  
  // Netflix
  if (g.includes('netflix') || g.includes('نتفلكس')) return serNetflixLogo;
  
  // Disney
  if (g.includes('disney')) return serDisneyLogo;
  
  // Generic English series
  if (g.includes('english') || g.includes('انجليزي')) return serEnglishLogo;

  // Regions
  if (g.includes('asia') || g.includes('asian') || g.includes('آسيا')) return serAsiaLogo;
  if (g.includes('world') || g.includes('international') || g.includes('عالم')) return serWorldLogo;
  if (g.includes('albania') || g.includes('shqip') || g.includes('ألبان')) return serAlbaniaLogo;
  
  // Year Fallbacks
  if (g.includes('2026')) return serArabic2026Logo;
  if (g.includes('2025')) return serArabic2025Logo;
  if (g.includes('2024')) return serArabic2024Logo;
  if (g.includes('2023')) return serArabic2023Logo;
  
  return null;
};

// Match group names to custom category logos (MOVIES ONLY)
const getMovieCategoryLogo = (groupName: string): string | null => {
  const g = (groupName + ' ' + translateGroupName(groupName)).toLowerCase();
  
  // Arabic Movies by Year/Era
  if ((g.includes('arabic') || g.includes('عربي')) && g.includes('2026')) return arabicMovies2026Logo;
  if ((g.includes('arabic') || g.includes('عربي')) && g.includes('2025')) return arabicMovies2025Logo;
  if ((g.includes('arabic') || g.includes('عربي')) && g.includes('2024')) return arabicMovies2024Logo;
  if ((g.includes('arabic') || g.includes('عربي')) && g.includes('2023')) return arabicMovies2023Logo;
  if ((g.includes('arabic') || g.includes('عربي')) && (g.includes('197') || g.includes('198') || g.includes('199') || g.includes('200') || g.includes('classic') || g.includes('old'))) return arabicMovies1970s2000sLogo;

  // Dubbed Foreign movies (check BEFORE foreign subtitled to avoid wrong match)
  if (g.includes('dub') && (g.includes('foreign') || g.includes('مدبلجة'))) return englishDubbedMoviesLogo;

  // Foreign Subtitled (only match if NOT dubbed)
  if (g.includes('foreign') && !g.includes('dub') && (g.includes('2000') || g.includes('2021') || g.includes('201'))) return foreignSub2000sLogo;
  if (g.includes('foreign') && !g.includes('dub') && g.includes('2022')) return foreignSub2022Logo;
  if (g.includes('foreign') && !g.includes('dub') && g.includes('2023')) return foreignSub2023Logo;
  if (g.includes('foreign') && !g.includes('dub') && g.includes('2024')) return foreignSub2024Logo;
  if (g.includes('foreign') && !g.includes('dub') && g.includes('2025')) return foreignSub2025Logo;
  if (g.includes('foreign') && !g.includes('dub') && g.includes('2026')) return foreignSub2026Logo;

  // Cartoons - don't require "arabic" prefix
  if (g.includes('dub') && g.includes('cartoon')) return arabicDubbedCartoonLogo;
  if (g.includes('sub') && g.includes('cartoon')) return arabicSubbedCartoonLogo;

  // Specific Genres/Types
  if (g.includes('english') && g.includes('dub')) return englishDubbedMoviesLogo;
  if (g.includes('weekend') || g.includes('marathon') || g.includes('سهرة') || g.includes('خميس') || g.includes('جمعة') || g.includes('ويك')) return weekendMoviesLogo;
  if (g.includes('christmas') || g.includes('holiday') || g.includes('xmas') || g.includes('كريسماس')) return christmasMoviesLogo;
  if (g.includes('documentary') || g.includes('docu') || g.includes('وثائقي')) return documentaryMoviesLogo;
  if (g.includes('indian') || g.includes('bollywood') || g.includes('hindi') || g.includes('هندي')) return indianMoviesLogo;
  if (g.includes('turkish') || g.includes('turk') || g.includes('ترك')) return turkishMoviesLogo;
  
  // Actor/Star collections
  if (g.includes('pacino') || g.includes('باتشينو') || g.includes('باشينو')) return alPacinoLogo;
  if (g.includes('dicaprio') || g.includes('di caprio') || g.includes('كابريو') || g.includes('ليوناردو')) return leonardoDicaprioLogo;
  if (g.includes('adel') && g.includes('imam') || g.includes('عادل') || g.includes('امام')) return adelImamLogo;
  if (g.includes('samir') && g.includes('ghanem') || g.includes('سمير') || g.includes('غانم')) return samirGhanemLogo;
  
  // WWE
  if (g.includes('wwe') || g.includes('wrestling') || g.includes('مصارعة')) return wweLogo;
  
  // Comedy
  if (g.includes('comedy') || g.includes('كوميدي') || g.includes('كوميديا')) return enComedyLogo;
  
  // Theater/Plays
  if (g.includes('theater') || g.includes('theatre') || g.includes('play') || g.includes('مسرح') || g.includes('مسرحي') || g.includes('مسرحيات')) return theaterPlaysLogo;

  // DC Comics
  if (g.includes('dc ') || g.includes('dc-') || g.includes('دي سي')) return dcMoviesLogo;
  
  // Disney Shorts
  if (g.includes('disney') && g.includes('short')) return disneyShortsLogo;
  
  // Drama & Romance
  if ((g.includes('drama') || g.includes('romance') || g.includes('رومانسي') || g.includes('دراما')) && !g.includes('arabic')) return enDramaRomanceLogo;
  
  // HBO / Amazon Prime
  if (g.includes('hbo') || g.includes('amazon') || g.includes('prime')) return enHboAmazonLogo;
  
  // Kids & Family
  if (g.includes('kids') || g.includes('family') || g.includes('اطفال') || g.includes('عائلي') || g.includes('أطفال')) return enKidsFamilyLogo;
  
  // Star Wars
  if (g.includes('star wars') || g.includes('starwars') || g.includes('ستار وورز')) return enStarWarsLogo;
  
  // Formula 1
  if (g.includes('formula') || g.includes('f1') || g.includes('فورمولا')) return formula1Logo;
  
  // Netflix
  if (g.includes('netflix') || g.includes('نتفلكس')) return enNetflixLogo;
  
  // Generic English movies
  if (g.includes('english') && (g.includes('mov') || g.includes('film') || g.includes('انجليزي'))) return englishMoviesLogo;
  
  // Albania
  if (g.includes('albania') || g.includes('ألبان')) return albaniaMoviesLogo;

  // Multi-Language Releases
  if (g.includes('multi') && (g.includes('lang') || g.includes('sub') || g.includes('release'))) return multiLangMoviesLogo;
  
  // Asia
  if (g.includes('asia') || g.includes('آسيا') || g.includes('asian')) return asiaMoviesLogo;
  
  // World
  if (g.includes('world') || g.includes('عالم') || g.includes('international')) return worldMoviesLogo;

  // Tech/Regional
  if (g.includes('4k')) return movies4kLogo;
  if (g.includes('3d')) return movies3dLogo;
  if (g.includes('german') || (g.includes('vod') && g.includes('germany'))) return vodGermanyLogo;
  
  // Generic Year Fallbacks (if no other specific match)
  if (g.includes('2026')) return foreignSub2026Logo;
  if (g.includes('2025')) return foreignSub2025Logo;
  if (g.includes('2024')) return foreignSub2024Logo;
  if (g.includes('2023')) return foreignSub2023Logo;
  if (g.includes('2022')) return foreignSub2022Logo;
  if (g.includes('2021') || g.includes('2000') || g.includes('201') || g.includes('200')) return foreignSub2000sLogo;
  
  return null;
};

// Unified getter that picks the right function based on category
const getCategoryLogo = (groupName: string, category?: 'movies' | 'series'): string | null => {
  if (category === 'series') return getSeriesCategoryLogo(groupName);
  return getMovieCategoryLogo(groupName);
};

const WeatherIcon = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'sun': return <Sun className="w-5 h-5" />;
    case 'rain': return <CloudRain className="w-5 h-5" />;
    case 'snow': return <Snowflake className="w-5 h-5" />;
    case 'storm': return <CloudLightning className="w-5 h-5" />;
    default: return <Cloud className="w-5 h-5" />;
  }
};

// Get category emoji based on group name - improved for movies/series
const getCategoryEmoji = (group: string): string => {
  const groupLower = group.toLowerCase();
  
  // Streaming platforms
  if (groupLower.includes('netflix') || group.includes('نتفلكس')) return '🎬';
  if (groupLower.includes('amazon') || groupLower.includes('prime')) return '📦';
  if (groupLower.includes('hulu')) return '📺';
  if (groupLower.includes('disney')) return '🏰';
  if (groupLower.includes('hbo') || groupLower.includes('max')) return '🎭';
  if (groupLower.includes('osn')) return '📡';
  if (groupLower.includes('starz')) return '⭐';
  if (groupLower.includes('showtime')) return '🎪';
  if (groupLower.includes('apple')) return '🍎';
  if (groupLower.includes('paramount')) return '🏔️';
  if (groupLower.includes('peacock')) return '🦚';
  if (groupLower.includes('crunchyroll')) return '🍥';
  if (groupLower.includes('shahid')) return '📺';
  if (groupLower.includes('bein')) return '⚽';
  
  // Seasonal content
  if (groupLower.includes('christmas') || groupLower.includes('holiday') || groupLower.includes('xmas')) return '🎄';
  if (groupLower.includes('halloween')) return '🎃';
  if (groupLower.includes('ramadan') || group.includes('رمضان')) return '🌙';
  if (groupLower.includes('eid') || group.includes('عيد')) return '🕌';

  // Arabic content
  if (group.includes('عربي') || group.includes('arabic') || groupLower.includes('arab')) return '🇸🇦';
  if (group.includes('مصر') || groupLower.includes('egypt')) return '🇪🇬';
  if (group.includes('خليج') || groupLower.includes('khalij') || groupLower.includes('gulf')) return '🇦🇪';
  if (group.includes('مغرب') || groupLower.includes('maghreb')) return '🇲🇦';
  
  // Genres
  if (groupLower.includes('action') || groupLower.includes('adventure')) return '💥';
  if (groupLower.includes('comedy') || group.includes('كوميدي')) return '😂';
  if (groupLower.includes('horror') || groupLower.includes('scary') || group.includes('رعب')) return '👻';
  if (groupLower.includes('crime') || groupLower.includes('mystery') || groupLower.includes('thriller')) return '🔍';
  if (groupLower.includes('sci-fi') || groupLower.includes('fantasy') || groupLower.includes('scifi')) return '🚀';
  if (groupLower.includes('romance') || group.includes('رومانسي')) return '💕';
  if (groupLower.includes('drama') || group.includes('دراما')) return '🎭';
  if (groupLower.includes('animation') || groupLower.includes('anime') || group.includes('انمي')) return '🎨';
  if (groupLower.includes('family') || groupLower.includes('kids') || group.includes('اطفال')) return '👨‍👩‍👧‍👦';
  if (groupLower.includes('war') || groupLower.includes('military')) return '⚔️';
  if (groupLower.includes('western')) return '🤠';
  if (groupLower.includes('sports')) return '🏆';
  if (groupLower.includes('documentary') || groupLower.includes('doc') || group.includes('وثائقي')) return '📽️';
  if (groupLower.includes('biography') || groupLower.includes('history')) return '📜';
  if (groupLower.includes('music') || groupLower.includes('musical')) return '🎵';
  
  // Years (2020s first)
  if (groupLower.match(/\b202[4-9]\b/) || groupLower.match(/\b2030\b/)) return '🆕';
  if (groupLower.match(/\b202[0-3]\b/)) return '📅';
  if (groupLower.match(/\b201\d\b/)) return '📆';
  if (groupLower.match(/\b20[01]\d\b/)) return '🗓️';
  if (groupLower.match(/\b(19\d{2})\b/)) return '📼';
  
  // Other content types
  if (groupLower.includes('indian') || group.includes('هند')) return '🇮🇳';
  if (groupLower.includes('turk') || group.includes('ترك')) return '🇹🇷';
  if (groupLower.includes('korean') || groupLower.includes('kdrama')) return '🇰🇷';
  if (groupLower.includes('power') || groupLower.includes('wrestling') || groupLower.includes('wwe')) return '🤼';
  if (groupLower.includes('3d')) return '🥽';
  if (groupLower.includes('cartoon') || group.includes('كرتون')) return '🎨';
  if (groupLower.includes('country') && groupLower.includes('fr')) return '🇫🇷';
  if (groupLower.includes('vod en') || groupLower.includes('english')) return '🇬🇧';
  if (groupLower.includes('adult') || groupLower.includes('xxx')) return '🔞';
  
  return '🎬';
};

const shortenGroupName = (name: string): string => {
  let clean = translateGroupName(name);
  
  const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? yearMatch[0] : '';
  const lower = clean.toLowerCase();
  
  // Arabic Movies with Year
  if ((lower.includes('arabic') || lower.includes('عربي')) && (lower.includes('movie') || lower.includes('film') || lower.includes('mov')) && year) {
    return `Arabic ${year}`;
  }
  
  // Dubbed Foreign (check before generic foreign to avoid overlap)
  if (lower.includes('dub') && (lower.includes('foreign') || lower.includes('مدبلجة'))) {
    return 'Dubbed Foreign';
  }

  // Foreign Subtitled with Year
  if ((lower.includes('foreign') || lower.includes('أجنبي')) && (lower.includes('2000') || lower.includes('2021') || lower.includes('201'))) {
    return "Foreign 2000's";
  }
  if ((lower.includes('foreign') || lower.includes('أجنبي')) && year) {
    return `Foreign ${year}`;
  }
  
  // English Dubbed
  if (lower.includes('english') && lower.includes('dub')) {
    return year ? `English ${year}` : 'English Dubbed';
  }

  // Cartoons
  if (lower.includes('cartoon') && lower.includes('dub')) return 'Cartoon Dubbed';
  if (lower.includes('cartoon') && lower.includes('sub')) return 'Cartoon Subbed';
  if (lower.includes('cartoon')) return 'Cartoons';

  // Weekend/Thursday
  if (lower.includes('thursday') || lower.includes('weekend') || name.includes('الخميس') || name.includes('سهرة')) {
    return 'Weekend';
  }

  // Specific genres
  if (lower.includes('documentary') || lower.includes('docu') || lower.includes('وثائقي')) return 'Documentaries';
  if (lower.includes('christmas') || lower.includes('كريسماس')) return 'Christmas';
  if (lower.includes('indian') || lower.includes('هندي')) return 'Indian';
  if (lower.includes('turkish') || lower.includes('turk') || lower.includes('ترك')) return 'Turkish';
  if (lower.includes('german') || lower.includes('germany')) return 'German VOD';
  
  // Tech
  if (lower.includes('4k')) return '4K Movies';
  if (lower.includes('3d')) return '3D Movies';

  // General Cleanup
  clean = clean
    .replace(/\b(Movies|Films|Series|Season|Complete|Full|HD|FHD|HEVC|New|Latest|Update|Library|Collection|Pack|Box|Set|From|By|VOD|Vod)\b/gi, '')
    .replace(/(مكتبة|أفلام|مسلسلات|افلام)/g, '')
    .replace(/[|•\-–_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  return clean || name;
};

interface MiMediaGridProps {
  items: Channel[];
  favorites: Set<string>;
  onItemSelect: (item: Channel, selectedGroup: string) => void;
  onToggleFavorite: (itemId: string) => void;
  onBack: () => void;
  category: 'movies' | 'series';
  initialSelectedGroup?: string;
}

export const MiMediaGrid = ({
  items,
  favorites,
  onItemSelect,
  onToggleFavorite,
  onBack,
  category,
  initialSelectedGroup,
}: MiMediaGridProps) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(initialSelectedGroup || '');
  const [sortBy, setSortBy] = useState<string>('number');
  const [time] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weather = useWeather();
  const isMobile = useIsMobile();

  // Smart sorting for groups: Arabic → English → Anime → Streaming platforms → everything else
  const getGroupSortPriority = (groupName: string): number => {
    const g = groupName.toLowerCase();
    
    // === 1. ARABIC content first (priority 1-50) ===
    // Egyptian content gets top priority within Arabic
    if (groupName.includes('مصر') || g.includes('egypt') || g.includes('egyptian')) return 1;
    // Ramadan specials
    if (g.includes('ramadan') || groupName.includes('رمضان')) return 2;
    if (g.includes('eid') || groupName.includes('عيد')) return 3;
    // Generic Arabic
    if (g.includes('arab') || groupName.includes('عربي') || groupName.includes('افلام عربي')) return 5;
    if (groupName.includes('خليج') || g.includes('khalij') || g.includes('gulf')) return 6;
    if (groupName.includes('مغرب') || g.includes('maghreb')) return 7;
    if (g.includes('osn') || g.includes('shahid')) return 8;
    // AR MOV / AR SER year-based groups (newer first, top priority)
    const arYearMatch = g.match(/^ar\s+(mov|ser|movies?|series)\s+((?:19|20)\d{2})/i);
    if (arYearMatch) {
      const year = parseInt(arYearMatch[2]);
      return 10 + (2040 - year); // 2026→24, 2025→25, etc.
    }
    // Arabic years (newer first)
    const hasArabicHint = /[\u0600-\u06FF]/.test(groupName);
    if (hasArabicHint) {
      const yearMatch = g.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) return 10 + (2040 - parseInt(yearMatch[0]));
      return 40;
    }
    
    // === 2. ENGLISH content (priority 100-150) ===
    if (g.includes('english') || g.includes('vod en') || g.match(/\ben\b/)) return 100;
    if (g.includes('uk') || g.includes('us ') || g.includes('usa')) return 101;
    
    // === 3. ANIME content (priority 200-220) ===
    if (g.includes('anime') || g.includes('انمي') || g.includes('anm') || g.includes('crunchyroll')) return 200;
    if (g.includes('cartoon') || groupName.includes('كرتون') || g.includes('animation')) return 210;
    
    // === 4. STREAMING PLATFORMS (priority 300-350) ===
    if (g.includes('netflix')) return 300;
    if (g.includes('disney')) return 301;
    if (g.includes('hbo') || g.includes('max')) return 302;
    if (g.includes('amazon') || g.includes('prime')) return 303;
    if (g.includes('apple')) return 304;
    if (g.includes('paramount')) return 305;
    if (g.includes('hulu')) return 306;
    if (g.includes('peacock')) return 307;
    if (g.includes('starz')) return 308;
    if (g.includes('showtime')) return 309;
    
    // === 5. Year-based categories (priority 400-460) ===
    const yearMatch = g.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      return 400 + (2040 - year);
    }
    
    // === 6. Seasonal content (priority 500) ===
    if (g.includes('christmas') || g.includes('holiday') || g.includes('xmas')) return 500;
    
    // === 7. Everything else (priority 900+) ===
    return 900;
  };

  // Filter out groups that don't belong in movies/series (music, concerts, sports events, etc.)
  const isIrrelevantGroup = (groupName: string): boolean => {
    const g = groupName.toLowerCase();
    if (g.includes('music') || g.includes('موسيق') || g.includes('حفلات') || g.includes('concert')) return true;
    if (g.includes('radio') || g.includes('راديو')) return true;
    if (g.includes('podcast')) return true;
    if (g.includes('adult') || g.includes('xxx') || g.includes('18+')) return true;
    if (g.includes('live ') && !g.includes('live action')) return true;
    return false;
  };

  const groups = useMemo(() => {
    const groupCounts = new Map<string, { count: number; firstLogo?: string }>();
    items.forEach((item) => {
      const group = item.group || 'Uncategorized';
      // Skip irrelevant groups
      if (isIrrelevantGroup(group)) return;
      const existing = groupCounts.get(group);
      if (!existing) {
        groupCounts.set(group, { count: 1, firstLogo: item.backdrop_path?.[0] || item.logo });
      } else {
        existing.count++;
        // Use better logo if available
        if (!existing.firstLogo && (item.backdrop_path?.[0] || item.logo)) {
          existing.firstLogo = item.backdrop_path?.[0] || item.logo;
        }
      }
    });
    
    // Sort by priority (year desc, then Arabic, then seasonal, then alpha)
    return Array.from(groupCounts.entries())
      .sort((a, b) => {
        const priorityA = getGroupSortPriority(a[0]);
        const priorityB = getGroupSortPriority(b[0]);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a[0].localeCompare(b[0]);
      })
      .map(([name, data]) => ({ name, count: data.count, firstLogo: data.firstLogo }));
  }, [items]);

  // Set selectedGroup to the first group in the sorted list if not already set
  useEffect(() => {
    if (!selectedGroup && groups.length > 0) {
      setSelectedGroup(groups[0].name);
    }
  }, [groups, selectedGroup]);

  const filteredItems = useMemo(() => {
    let filtered = items.filter((item) => {
      // Skip irrelevant groups
      if (isIrrelevantGroup(item.group || '')) return false;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      // When searching, ignore group filter and search ALL items
      // Use first group if selectedGroup is empty
      const effectiveGroup = selectedGroup || (groups.length > 0 ? groups[0].name : 'all');
      const matchesGroup = searchQuery.trim() ? true : (effectiveGroup === 'all' || item.group === effectiveGroup);
      const matchesFavorites = !showFavoritesOnly || favorites.has(item.id);
      return matchesSearch && matchesGroup && matchesFavorites;
    });

    switch (sortBy) {
      case 'a-z':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'z-a':
        filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
        break;
      case 'year':
        filtered = [...filtered].sort((a, b) => {
          const yearA = parseInt(a.year || '0');
          const yearB = parseInt(b.year || '0');
          return yearB - yearA; // Descending (newest first)
        });
        break;
      case 'number':
      default:
        // Default: sort by year descending, then by name
        filtered = [...filtered].sort((a, b) => {
          const yearA = parseInt(a.year || '0');
          const yearB = parseInt(b.year || '0');
          if (yearA !== yearB) return yearB - yearA;
          return a.name.localeCompare(b.name);
        });
        break;
    }

    return filtered;
  }, [items, searchQuery, selectedGroup, sortBy, showFavoritesOnly, favorites]);

  const { visibleItems, onScroll, hasMore } = useProgressiveList(filteredItems, {
    initial: 60,
    step: 60,
  });

  // Resolve TMDB posters for visible items (replaces scene stills with proper posters)
  const { getPosterForChannel } = useTMDBPosters(visibleItems);

  const title = category === 'movies' ? 'Movies' : 'Series';

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    if (isMobile) setSidebarOpen(false);
    // Reset scroll to top when changing groups
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="h-full flex bg-background relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Categories */}
      <div className={`
        ${isMobile 
          ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'w-64 flex-shrink-0'
        } 
        flex flex-col border-r border-border/30 bg-background
      `}>
        {/* Back Button & Title */}
        <div className="flex items-center gap-4 p-4 md:p-5">
          {isMobile ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all duration-100"
            >
              <ChevronLeft className="w-6 h-6 text-muted-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <div className="flex gap-0.5">
              <Star className="w-4 h-4 mi-star-filled" />
              <Star className="w-4 h-4 mi-star-filled" />
            </div>
          </div>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 mi-scrollbar">
          {groups.map((group) => (
            <button
              key={group.name}
              onClick={() => handleGroupSelect(group.name)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                selectedGroup === group.name
                  ? 'bg-card ring-2 ring-accent/50'
                  : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {/* Use custom category logo first, then group's first poster, then emoji */}
                {getCategoryLogo(group.name, category) ? (
                  <img 
                    src={getCategoryLogo(group.name, category)!} 
                    alt={group.name} 
                    className="w-full h-full object-cover scale-150"
                  />
                ) : group.firstLogo ? (
                  <img 
                    src={group.firstLogo} 
                    alt={group.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl">${getCategoryEmoji(group.name)}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-2xl">{getCategoryEmoji(group.name)}</span>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm truncate ${selectedGroup === group.name ? 'font-semibold text-foreground' : ''}`}>
                  {shortenGroupName(group.name)}
                </p>
                {selectedGroup === group.name && (
                  <p className="text-xs text-muted-foreground">{group.count} {title}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Nav - Favorites Filter */}
        <div className="p-4 flex flex-col gap-2">
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              showFavoritesOnly ? 'bg-accent text-white ring-2 ring-accent/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={showFavoritesOnly ? 'Show All' : 'Show Favorites Only'}
          >
            <Heart className={`w-6 h-6 ${showFavoritesOnly ? 'fill-white text-white' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content - Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/30 gap-2">
          {/* Mobile Menu Button & Back */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className={`${isMobile ? 'w-32' : 'w-60'} bg-card border-border/50 rounded-xl h-10 md:h-12`}>
              <SelectValue placeholder="Order By" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/50">
              <SelectItem value="number">Latest First</SelectItem>
              <SelectItem value="year">By Year</SelectItem>
              <SelectItem value="rating">By Rating</SelectItem>
              <SelectItem value="a-z">A-Z</SelectItem>
              <SelectItem value="z-a">Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* Time & Weather - Hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-6">
              <span className="text-foreground font-medium text-lg">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <WeatherIcon icon={weather.icon} />
                <span>{weather.displayTemp}</span>
              </div>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {showSearchInput ? (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery) setShowSearchInput(false);
                  }}
                  className="w-40 md:w-60 px-4 py-2 bg-card border border-border/50 rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchInput(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-card flex items-center justify-center hover:bg-card/80 transition-colors"
              >
                <Search className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </button>
            )}
            {!isMobile && (
              <div className="w-11 h-11 rounded-full bg-primary overflow-hidden flex items-center justify-center ring-2 ring-primary/30">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Media Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 mi-scrollbar" onScroll={onScroll}>
          <div className={`grid gap-3 md:gap-4 ${
            isMobile 
              ? 'grid-cols-2' 
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
          }`}>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemSelect(item, selectedGroup)}
                className="group text-left cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onItemSelect(item, selectedGroup);
                  }
                }}
              >
                {/* Poster */}
                <div className="mi-poster-card bg-card aspect-[2/3] relative rounded-lg overflow-hidden">
                  {(() => {
                    const tmdbPoster = getPosterForChannel(item.name);
                    const posterSrc = tmdbPoster || item.logo || item.backdrop_path?.[0];
                    return posterSrc ? (
                      <>
                        <img
                          src={posterSrc}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (tmdbPoster && item.backdrop_path?.[0] && target.src !== item.backdrop_path[0]) {
                              target.src = item.backdrop_path[0];
                            } else if (item.logo && target.src !== item.logo) {
                              target.src = item.logo;
                            } else {
                              target.style.display = 'none';
                            }
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Film className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
                      </div>
                    );
                  })()}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-transparent group-hover:bg-foreground transition-colors" />
                </div>

                {/* Title & Info */}
                <div className="mt-2 md:mt-3">
                  <h3 className="text-foreground font-medium truncate text-sm md:text-base">{item.name}</h3>
                  <div className="flex items-center gap-1 md:gap-2 text-muted-foreground text-xs md:text-sm">
                    {item.year && <span>{item.year}</span>}
                    {item.duration && <span>• {item.duration}</span>}
                    {item.rating && <span>• ⭐ {item.rating}</span>}
                    {!item.year && !item.duration && !item.rating && <span className="truncate">{item.group}</span>}
                  </div>
                </div>

                {/* Badges & Favorite */}
                <div className="flex items-center justify-between mt-1.5 md:mt-2">
                  <div className="flex gap-1">
                    <span className="mi-badge-hd text-xs">HD</span>
                    {item.genre && !isMobile && <span className="mi-badge-hd text-xs">{item.genre.split(',')[0]}</span>}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favorites.has(item.id)
                          ? 'mi-star-filled'
                          : 'text-muted-foreground hover:mi-star'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="py-6 text-center text-muted-foreground text-sm">Loading more…</div>
          )}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted-foreground text-lg">No {title.toLowerCase()} found</p>
              <p className="text-muted-foreground/60 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
