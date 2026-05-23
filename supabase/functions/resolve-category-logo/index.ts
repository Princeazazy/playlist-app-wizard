// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const BRANDFETCH_CLIENT_ID = Deno.env.get("BRANDFETCH_CLIENT_ID");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

// Guess a domain for a brand name
function guessDomain(name: string): string | null {
  const n = name.toLowerCase().trim();
  const map: Record<string, string> = {
    "disney+": "disneyplus.com",
    "disney plus": "disneyplus.com",
    disney: "disneyplus.com",
    netflix: "netflix.com",
    hulu: "hulu.com",
    "hbo max": "max.com",
    hbo: "hbo.com",
    max: "max.com",
    "amazon prime": "primevideo.com",
    "prime video": "primevideo.com",
    "apple tv": "tv.apple.com",
    "apple tv+": "tv.apple.com",
    paramount: "paramountplus.com",
    "paramount+": "paramountplus.com",
    peacock: "peacocktv.com",
    starz: "starz.com",
    starzplay: "starzplay.com",
    shahid: "shahid.mbc.net",
    osn: "osnplus.com",
    "osn+": "osnplus.com",
    mbc: "mbc.net",
    rotana: "rotana.net",
    jawwy: "jawwy.tv",
    "bein sports": "beinsports.com",
    bein: "beinsports.com",
    showtime: "sho.com",
    crunchyroll: "crunchyroll.com",
    "pluto tv": "pluto.tv",
    dazn: "dazn.com",
    espn: "espn.com",
    "sky sports": "skysports.com",
    "fox sports": "foxsports.com",
    eurosport: "eurosport.com",
    "tnt sports": "tntsports.co.uk",
    "bt sport": "tntsports.co.uk",
    "premier league": "premierleague.com",
    "la liga": "laliga.com",
    "serie a": "legaseriea.it",
    bundesliga: "bundesliga.com",
    uefa: "uefa.com",
    "champions league": "uefa.com",
    bbc: "bbc.co.uk",
    cnn: "cnn.com",
    "al jazeera": "aljazeera.com",
    "al arabiya": "alarabiya.net",
    marvel: "marvel.com",
    pixar: "pixar.com",
    "star wars": "starwars.com",
    wwe: "wwe.com",
    ufc: "ufc.com",
    "formula 1": "formula1.com",
    f1: "formula1.com",
  };
  for (const [k, v] of Object.entries(map)) {
    if (n === k || n.includes(k)) return v;
  }
  return null;
}

async function tryBrandfetch(name: string): Promise<string | null> {
  const domain = guessDomain(name);
  if (!domain) return null;
  // Public CDN — no key needed for the icon endpoint; client_id improves rate limits
  const url = BRANDFETCH_CLIENT_ID
    ? `https://cdn.brandfetch.io/${domain}/w/512/h/512?c=${BRANDFETCH_CLIENT_ID}`
    : `https://cdn.brandfetch.io/${domain}/w/512/h/512`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (r.ok) return url;
  } catch (_) {}
  return null;
}

async function generateWithAI(name: string, category: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;

  const prompt = `Clean minimalist square LOGO ICON badge representing the category "${name}" for a ${category} streaming app. Bold simple iconography, centered, flat vector style, vibrant gradient background, high contrast, no text unless brand name is essential. Premium app icon aesthetic, 1:1 square.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      console.error("AI gen failed", r.status, await r.text());
      return null;
    }
    const data = await r.json();
    const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) return null;

    // Upload to storage
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `ai/${slug(name)}-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("category-logos")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.error("upload err", upErr);
      return null;
    }
    const { data: pub } = supabase.storage.from("category-logos").getPublicUrl(path);
    return pub.publicUrl;
  } catch (e) {
    console.error("ai err", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, category = "movies" } = await req.json();
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = `${category}:${name.toLowerCase().trim()}`;

    // 1. Cache lookup
    const { data: cached } = await supabase
      .from("category_logos")
      .select("logo_url, source")
      .eq("cache_key", key)
      .maybeSingle();
    if (cached?.logo_url) {
      return new Response(JSON.stringify({ url: cached.logo_url, source: cached.source, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Brandfetch
    let url = await tryBrandfetch(name);
    let source = "brandfetch";

    // 3. AI fallback
    if (!url) {
      url = await generateWithAI(name, category);
      source = "ai";
    }

    if (!url) {
      return new Response(JSON.stringify({ url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist cache
    await supabase.from("category_logos").insert({
      cache_key: key,
      raw_name: name,
      category,
      logo_url: url,
      source,
    });

    return new Response(JSON.stringify({ url, source, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
