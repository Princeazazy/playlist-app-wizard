// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const SYSTEM = `You are a playlist category normalizer for an IPTV / VOD app.
Given a list of raw category names (mix of Arabic, English, French, with codes like "AR| ", "VOD: ", "HD", "4K", country/year prefixes), group them and assign a clean canonical name.

Rules:
- Output ONE canonical name per raw input, even if it's the same.
- Canonical names should be human-readable, language-appropriate, no junk codes/quality tags/separators.
- Preserve the dominant network/brand (Netflix, Disney+, MBC, Shahid, beIN, etc.) — never merge different networks together.
- Preserve genres clearly (Action, Drama, Kids, Documentary, Horror, Comedy, Romance, Thriller, Sci-Fi, Anime, Sports).
- Country / language groupings stay separated (Arabic, Egyptian, Turkish, Indian, French, English).
- Year buckets stay (2025, 2024, 2023, 2010s, 2000s) when present.
- If a name is just junk / unknown, keep its cleaned-up form.
Return STRICT JSON only via the tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { names, kind = "movies" } = await req.json();
    if (!Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ error: "names[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // dedupe + cache check
    const unique = [...new Set(names.map((n: string) => String(n).trim()).filter(Boolean))];
    const { data: cached } = await supabase
      .from("category_canonical")
      .select("raw_name, canonical_name")
      .in("raw_name", unique);

    const cacheMap = new Map<string, string>();
    (cached || []).forEach((c: any) => cacheMap.set(c.raw_name, c.canonical_name));
    const missing = unique.filter((n) => !cacheMap.has(n));

    if (missing.length > 0) {
      // Process in batches of 80 to keep prompt small
      const batchSize = 80;
      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `Kind: ${kind}\nRaw categories:\n${batch.map((b, j) => `${j + 1}. ${b}`).join("\n")}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "emit_mapping",
                  description: "Emit canonical name for each raw category",
                  parameters: {
                    type: "object",
                    properties: {
                      mapping: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            raw: { type: "string" },
                            canonical: { type: "string" },
                          },
                          required: ["raw", "canonical"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["mapping"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "emit_mapping" } },
          }),
        });

        if (r.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!r.ok) {
          console.error("AI err", r.status, await r.text());
          continue;
        }
        const data = await r.json();
        const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) continue;
        const parsed = JSON.parse(args);
        const rows = (parsed.mapping || []).map((m: any) => ({
          raw_name: m.raw,
          canonical_name: m.canonical,
          kind,
        }));
        if (rows.length > 0) {
          await supabase.from("category_canonical").upsert(rows, { onConflict: "raw_name" });
          rows.forEach((r: any) => cacheMap.set(r.raw_name, r.canonical_name));
        }
      }
    }

    const mapping: Record<string, string> = {};
    unique.forEach((n) => {
      mapping[n] = cacheMap.get(n) || n;
    });

    return new Response(JSON.stringify({ mapping }), {
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
