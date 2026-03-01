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
  status: string; // 'live' | 'upcoming' | 'finished'
  statusText: string;
  channels: string[];
  league: string;
  date: string; // YYYY-MM-DD
}

function parseMatches(html: string): Match[] {
  const matches: Match[] = [];
  
  // Normalize whitespace for easier regex matching
  const normalizedHtml = html.replace(/\n\s*/g, ' ');
  
  // Split by AY_Match divs
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
      }
      
      // Extract team names
      const tmNameMatches = [...block.matchAll(/<div class="TM_Name">(.*?)<\/div>/g)];
      if (tmNameMatches.length < 2) continue;
      
      const homeTeam = tmNameMatches[0][1].trim();
      const awayTeam = tmNameMatches[1][1].trim();
      
      // Extract team logos
      const logoMatches = [...block.matchAll(/(?:data-src|src)="(https:\/\/www\.yalla-shoot--hd\.live\/wp-content\/uploads\/[^"]+)"/g)];
      const homeLogo = logoMatches.length > 0 ? logoMatches[0][1] : '';
      const awayLogo = logoMatches.length > 1 ? logoMatches[1][1] : '';
      
      // Extract time
      const timeMatch = block.match(/MT_Time[^>]*>(.*?)<\/span>/);
      const time = timeMatch ? timeMatch[1].trim() : '';
      
      // Extract score
      const goalMatches = [...block.matchAll(/RS-goals[^>]*>(.*?)<\/span>/g)];
      const score = goalMatches.length >= 2 
        ? `${goalMatches[0][1]}-${goalMatches[1][1]}` 
        : '0-0';
      
      // Extract status text
      const statMatch = block.match(/MT_Stat[^>]*>(.*?)<\/div>/);
      const statusText = statMatch ? statMatch[1].trim() : '';
      
      // Fallback status from text if CSS class didn't catch it
      if (status === 'upcoming') {
        if (statusText.includes('جارية')) {
          status = 'live';
        } else if (statusText.includes('انتهت')) {
          status = 'finished';
        }
      }
      
      // Extract date from the match link title attribute (بتاريخ YYYY-MM-DD)
      const dateMatch = block.match(/بتاريخ\s+(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      
      // Extract channels and league from MT_Info
      const infoMatch = block.match(/<div class="MT_Info"><ul>(.*?)<\/ul><\/div>/);
      const channels: string[] = [];
      let league = '';
      
      if (infoMatch) {
        const liMatches = [...infoMatch[1].matchAll(/<li><span>(.*?)<\/span><\/li>/g)];
        if (liMatches.length > 0) {
          const ch = liMatches[0][1].trim();
          if (ch && ch !== 'غير معروف') {
            channels.push(ch);
          }
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
        league,
        date,
      });
    } catch (e) {
      console.error('Error parsing match block:', e);
    }
  }
  
  return matches;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching live matches from yalla-shoot...');
    
    const response = await fetch('https://www.yalla-shoot--hd.live/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const matches = parseMatches(html);
    
    console.log(`Parsed ${matches.length} matches`);

    return new Response(
      JSON.stringify({ success: true, matches, fetchedAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching matches:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message, matches: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
