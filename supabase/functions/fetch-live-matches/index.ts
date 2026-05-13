const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Match {
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  score: string;
  status: string; // 'live' | 'halftime' | 'upcoming' | 'finished' | 'not_started'
  statusText: string;
  channels: string[];
  commentator: string;
  league: string;
  date: string;
  dayLabel: string;
}

function parseMatches(html: string, dayLabel: string): Match[] {
  const matches: Match[] = [];
  const normalizedHtml = html.replace(/\n\s*/g, ' ');
  const matchBlocks = normalizedHtml.split('<div class="AY_Match');

  for (let i = 1; i < matchBlocks.length; i++) {
    const block = matchBlocks[i];

    try {
      // Determine status from CSS class
      let status = 'upcoming';
      if (block.startsWith(' live')) {
        status = 'live';
      } else if (block.startsWith(' finished')) {
        status = 'finished';
      } else if (block.startsWith(' not-started')) {
        status = 'not_started';
      } else if (block.startsWith(' comming-soon')) {
        status = 'upcoming';
      }

      // Extract team names
      const tmNameMatches = [...block.matchAll(/<div class="TM_Name">(.*?)<\/div>/g)];
      if (tmNameMatches.length < 2) continue;

      const homeTeam = tmNameMatches[0][1].trim();
      const awayTeam = tmNameMatches[1][1].trim();

      // Extract team logos - match img src or data-src
      const logoMatches = [...block.matchAll(/(?:data-src|src)="(https?:\/\/[^"]+\/wp-content\/uploads\/[^"]+)"/g)];
      const homeLogo = logoMatches.length > 0 ? logoMatches[0][1] : '';
      const awayLogo = logoMatches.length > 1 ? logoMatches[1][1] : '';

      // Extract time
      const timeMatch = block.match(/MT_Time[^>]*>(.*?)<\/span>/);
      const time = timeMatch ? timeMatch[1].trim() : '';

      // Extract score
      const goalMatches = [...block.matchAll(/RS-goals[^>]*>(.*?)<\/span>/g)];
      const score = goalMatches.length >= 2
        ? `${goalMatches[0][1].trim()}-${goalMatches[1][1].trim()}`
        : '0-0';

      // Extract status text
      const statMatch = block.match(/MT_Stat[^>]*>(.*?)<\/div>/);
      const statusText = statMatch ? statMatch[1].trim() : '';

      // Refine status from Arabic text
      if (statusText.includes('جارية')) {
        status = 'live';
      } else if (statusText.includes('انتهت')) {
        status = 'finished';
      } else if (statusText.includes('الشوط الأول') || statusText.includes('شوط أول')) {
        status = 'live';
      } else if (statusText.includes('استراحة') || statusText.includes('نصف')) {
        status = 'halftime';
      } else if (statusText.includes('لم تبدأ')) {
        status = 'not_started';
      } else if (statusText.includes('بعد قليل')) {
        status = 'upcoming';
      }

      // Extract date from match link
      const dateMatch = block.match(/بتاريخ\s+(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';

      // Extract channels, commentator, and league from MT_Info
      const infoMatch = block.match(/<div class="MT_Info"><ul>(.*?)<\/ul><\/div>/);
      const channels: string[] = [];
      let commentator = '';
      let league = '';

      if (infoMatch) {
        const liMatches = [...infoMatch[1].matchAll(/<li><span>(.*?)<\/span><\/li>/g)];
        // Pattern: channel, commentator, league
        if (liMatches.length > 0) {
          const ch = liMatches[0][1].trim();
          if (ch && ch !== 'غير معروف') channels.push(ch);
        }
        if (liMatches.length > 1) {
          commentator = liMatches[1][1].trim();
        }
        if (liMatches.length > 2) {
          league = liMatches[2][1].trim();
        }
      }

      matches.push({
        homeTeam,
        awayTeam,
        homeLogo,
        awayLogo,
        time,
        score,
        status,
        statusText,
        channels,
        commentator,
        league,
        date,
        dayLabel,
      });
    } catch (e) {
      console.error('Error parsing match block:', e);
    }
  }

  return matches;
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ar,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

// ===== ESPN scoreboard integration for NBA & NFL =====
function formatEspnDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function dayLabelFor(offsetDays: number): string {
  if (offsetDays === 0) return 'today';
  if (offsetDays === 1) return 'tomorrow';
  if (offsetDays === -1) return 'yesterday';
  return 'today';
}

async function fetchEspn(sportPath: string, leagueLabel: string, offsetDays: number): Promise<Match[]> {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard?dates=${formatEspnDate(date)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`ESPN ${leagueLabel} ${offsetDays} failed: ${res.status}`);
      return [];
    }
    const json = await res.json();
    const events = Array.isArray(json?.events) ? json.events : [];
    const out: Match[] = [];

    for (const ev of events) {
      try {
        const comp = ev?.competitions?.[0];
        if (!comp) continue;
        const competitors = comp.competitors || [];
        const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
        if (!home || !away) continue;

        const stateRaw: string = comp.status?.type?.state || ev.status?.type?.state || 'pre';
        const completed: boolean = !!(comp.status?.type?.completed || ev.status?.type?.completed);
        let status: string = 'upcoming';
        if (completed || stateRaw === 'post') status = 'finished';
        else if (stateRaw === 'in') status = 'live';
        else status = 'not_started';

        const statusText: string = comp.status?.type?.shortDetail || ev.status?.type?.shortDetail || '';

        // Kickoff time HH:MM (local UTC)
        const dt = ev.date ? new Date(ev.date) : null;
        const time = dt
          ? `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`
          : '';
        const isoDate = dt ? dt.toISOString().slice(0, 10) : '';

        const homeScore = home.score ?? '0';
        const awayScore = away.score ?? '0';
        const score = `${homeScore}-${awayScore}`;

        // Broadcasts → channels
        const broadcasts: string[] = [];
        const bArr = comp.broadcasts || [];
        for (const b of bArr) {
          const names: string[] = b?.names || [];
          for (const n of names) if (n && !broadcasts.includes(n)) broadcasts.push(n);
        }
        if (broadcasts.length === 0 && Array.isArray(comp.geoBroadcasts)) {
          for (const gb of comp.geoBroadcasts) {
            const n = gb?.media?.shortName;
            if (n && !broadcasts.includes(n)) broadcasts.push(n);
          }
        }

        out.push({
          homeTeam: home.team?.displayName || home.team?.name || '',
          awayTeam: away.team?.displayName || away.team?.name || '',
          homeLogo: home.team?.logo || '',
          awayLogo: away.team?.logo || '',
          time,
          score,
          status,
          statusText,
          channels: broadcasts,
          commentator: '',
          league: leagueLabel,
          date: isoDate,
          dayLabel: dayLabelFor(offsetDays),
        });
      } catch (e) {
        console.error(`Error parsing ESPN ${leagueLabel} event:`, e);
      }
    }
    return out;
  } catch (e) {
    console.warn(`ESPN ${leagueLabel} ${offsetDays} error:`, (e as Error).message);
    return [];
  }
}

// ===== box.live boxing PPV schedule =====
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function boxingDayLabel(dateISO: string): string {
  if (!dateISO) return 'today';
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(dateISO + 'T00:00:00Z');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= -1) return 'yesterday';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'tomorrow'; // future fights surface under tomorrow tab
}

function parseBoxingDate(heading: string): string {
  // e.g. "Saturday, 16 May 2026"
  const m = heading.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return '';
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };
  const mm = months[m[2].toLowerCase()];
  if (!mm) return '';
  return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

async function fetchBoxing(): Promise<Match[]> {
  try {
    const html = await fetchPage('https://box.live/us-boxing-tv-schedule/');
    // Restrict to the full text schedule section (cleaner structure)
    const sectionStart = html.indexOf('id="full-text-schedule"');
    const segment = sectionStart >= 0 ? html.slice(sectionStart) : html;

    const out: Match[] = [];
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);

    // Split by date heading <h4 class="h3 mb-2"> ... </h4>
    const dayBlocks = segment.split(/<h4[^>]*class="h3[^"]*"[^>]*>/);
    for (let i = 1; i < dayBlocks.length; i++) {
      const block = dayBlocks[i];
      const headingEnd = block.indexOf('</h4>');
      if (headingEnd < 0) continue;
      const heading = cleanText(block.slice(0, headingEnd));
      const isoDate = parseBoxingDate(heading);
      if (!isoDate) continue;

      const target = new Date(isoDate + 'T00:00:00Z');
      const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
      // Skip past fights older than 1 day
      if (diffDays < -1) continue;

      const dayBody = block.slice(headingEnd);
      // Each card
      const cards = dayBody.split(/<div class="text-schedule[^"]*"/);
      for (let j = 1; j < cards.length; j++) {
        const card = cards[j];
        // Stop card at next h4 (next day) — already split, but defensive
        const nextDay = card.indexOf('<h4');
        const cardHtml = nextDay >= 0 ? card.slice(0, nextDay) : card;

        const titleM = cardHtml.match(/<h5[^>]*class="text-schedule__fight-title[^"]*"[^>]*>([\s\S]*?)<\/h5>/);
        if (!titleM) continue;
        const title = cleanText(titleM[1]);
        const vsParts = title.split(/\s+vs\s+/i);
        if (vsParts.length < 2) continue;
        const homeTeam = vsParts[0].trim();
        const awayTeam = vsParts.slice(1).join(' vs ').trim();

        const venueM = cardHtml.match(/<span[^>]*class="d-block text-schedule__venue"[^>]*>([\s\S]*?)<\/span>/);
        const venue = venueM ? cleanText(venueM[1]) : '';

        const tvM = cardHtml.match(/<strong>\s*US TV:\s*<\/strong>([\s\S]*?)<\/span>/i);
        const channels: string[] = [];
        if (tvM) {
          const tvText = cleanText(tvM[1]);
          for (const ch of tvText.split(/[,/]| and /i)) {
            const c = ch.trim();
            if (c) channels.push(c);
          }
        }

        let status = 'upcoming';
        if (diffDays < 0) status = 'finished';
        else if (diffDays === 0) status = 'upcoming';
        else status = 'not_started';

        out.push({
          homeTeam,
          awayTeam,
          homeLogo: '',
          awayLogo: '',
          time: '',
          score: 'vs',
          status,
          statusText: venue,
          channels,
          commentator: '',
          league: 'PPV Boxing',
          date: isoDate,
          dayLabel: boxingDayLabel(isoDate),
        });
      }
    }
    return out;
  } catch (e) {
    console.warn('Boxing fetch failed:', (e as Error).message);
    return [];
  }
}

async function fetchAllEspn(): Promise<Match[]> {
  const sports: Array<[string, string]> = [
    ['basketball/nba', 'NBA'],
    ['football/nfl', 'NFL'],
  ];
  const offsets = [0, 1, -1];
  const tasks: Promise<Match[]>[] = [];
  for (const [path, label] of sports) {
    for (const off of offsets) tasks.push(fetchEspn(path, label, off));
  }
  const results = await Promise.all(tasks);
  return results.flat();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching live matches from yalla-shotos.live + ESPN (NBA/NFL)...');

    const baseUrl = 'https://www.yalla-shotos.live';

    // Fetch all three day pages in parallel + ESPN NBA/NFL + box.live PPV Boxing
    const [yesterdayHtml, todayHtml, tomorrowHtml, espnMatches, boxingMatches] = await Promise.all([
      fetchPage(`${baseUrl}/matches-yesterday/`).catch(e => { console.warn('Yesterday fetch failed:', e.message); return ''; }),
      fetchPage(`${baseUrl}/matches-today/`).catch(e => { console.warn('Today fetch failed:', e.message); return ''; }),
      fetchPage(`${baseUrl}/matches-tomorrow/`).catch(e => { console.warn('Tomorrow fetch failed:', e.message); return ''; }),
      fetchAllEspn().catch(e => { console.warn('ESPN fetch failed:', e.message); return [] as Match[]; }),
      fetchBoxing().catch(e => { console.warn('Boxing fetch failed:', e.message); return [] as Match[]; }),
    ]);

    const yesterdayMatches = yesterdayHtml ? parseMatches(yesterdayHtml, 'yesterday') : [];
    const todayMatches = todayHtml ? parseMatches(todayHtml, 'today') : [];
    const tomorrowMatches = tomorrowHtml ? parseMatches(tomorrowHtml, 'tomorrow') : [];

    // Combine: today first, then tomorrow, then yesterday, then ESPN (NBA/NFL), then PPV Boxing
    const allMatches = [...todayMatches, ...tomorrowMatches, ...yesterdayMatches, ...espnMatches, ...boxingMatches];

    const nbaCount = espnMatches.filter(m => m.league === 'NBA').length;
    const nflCount = espnMatches.filter(m => m.league === 'NFL').length;
    console.log(`Parsed ${allMatches.length} matches (yesterday: ${yesterdayMatches.length}, today: ${todayMatches.length}, tomorrow: ${tomorrowMatches.length}, NBA: ${nbaCount}, NFL: ${nflCount}, Boxing PPV: ${boxingMatches.length})`);

    return new Response(
      JSON.stringify({ success: true, matches: allMatches, fetchedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, matches: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
