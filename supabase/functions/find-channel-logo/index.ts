import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Try to find a real logo via TMDB network search
async function searchTMDBLogo(
  channelName: string,
  tmdbKey: string
): Promise<string | null> {
  try {
    // Search TMDB for TV networks matching the channel name
    const searchUrl = `https://api.themoviedb.org/3/search/company?api_key=${tmdbKey}&query=${encodeURIComponent(channelName)}`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Find best match by name similarity
      const exact = data.results.find(
        (r: any) =>
          r.name.toLowerCase() === channelName.toLowerCase() && r.logo_path
      );
      const partial = data.results.find((r: any) => r.logo_path);
      const match = exact || partial;
      if (match?.logo_path) {
        return `https://image.tmdb.org/t/p/w200${match.logo_path}`;
      }
    }

    // Also try searching as a TV show (for channel-like shows)
    const tvUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(channelName)}`;
    const tvRes = await fetch(tvUrl);
    if (tvRes.ok) {
      const tvData = await tvRes.json();
      if (tvData.results && tvData.results.length > 0) {
        // Check if show name closely matches channel name
        const bestMatch = tvData.results.find(
          (r: any) =>
            r.name.toLowerCase().includes(channelName.toLowerCase()) ||
            channelName.toLowerCase().includes(r.name.toLowerCase())
        );
        if (bestMatch?.poster_path) {
          return `https://image.tmdb.org/t/p/w200${bestMatch.poster_path}`;
        }
      }
    }
  } catch (e) {
    console.error("TMDB search error:", e);
  }
  return null;
}

// Generate a logo using the AI gateway
async function generateLogo(
  channelName: string,
  lovableApiKey: string
): Promise<string | null> {
  try {
    const prompt = `Create a simple, clean, professional TV channel logo for "${channelName}". The logo should be a square icon with the channel name or its initials stylized in a modern way, with a dark background. Make it look like a real TV network logo. Minimalist design, bold typography.`;

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!res.ok) {
      console.error("AI generation failed:", res.status);
      return null;
    }

    const data = await res.json();
    const imageData =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageData || null;
  } catch (e) {
    console.error("Logo generation error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelNames } = await req.json();

    if (
      !channelNames ||
      !Array.isArray(channelNames) ||
      channelNames.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "channelNames array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit batch size
    const batch = channelNames.slice(0, 5);

    const tmdbKey = Deno.env.get("TMDB_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: Record<string, string | null> = {};

    for (const name of batch) {
      const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 60);

      // Check if we already have a generated logo in storage
      const { data: existingFile } = await supabase.storage
        .from("channel-logos")
        .getPublicUrl(`${sanitizedName}.png`);

      // Check if the file actually exists
      const checkRes = await fetch(existingFile.publicUrl, { method: "HEAD" });
      if (checkRes.ok) {
        results[name] = existingFile.publicUrl;
        continue;
      }

      // 1. Try TMDB search for real logo
      let logoUrl: string | null = null;
      if (tmdbKey) {
        logoUrl = await searchTMDBLogo(name, tmdbKey);
      }

      if (logoUrl) {
        results[name] = logoUrl;
        continue;
      }

      // 2. Generate a logo with AI and upload to storage
      if (lovableKey) {
        const base64Data = await generateLogo(name, lovableKey);
        if (base64Data) {
          // Extract the base64 content (remove data:image/png;base64, prefix)
          const base64Content = base64Data.replace(
            /^data:image\/[a-z]+;base64,/,
            ""
          );
          const binaryData = Uint8Array.from(
            atob(base64Content),
            (c) => c.charCodeAt(0)
          );

          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from("channel-logos")
            .upload(`${sanitizedName}.png`, binaryData, {
              contentType: "image/png",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from("channel-logos")
              .getPublicUrl(`${sanitizedName}.png`);
            results[name] = publicUrl.publicUrl;
          } else {
            console.error("Upload error:", uploadError);
            results[name] = null;
          }
        } else {
          results[name] = null;
        }
      } else {
        results[name] = null;
      }
    }

    return new Response(JSON.stringify({ logos: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
