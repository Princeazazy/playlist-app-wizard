import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// In-memory cache (per session) to avoid duplicate invokes
const memCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const LS_PREFIX = "cat-logo:";

function readLS(key: string): string | null | undefined {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    if (v === null) return undefined;
    return v === "__none__" ? null : v;
  } catch {
    return undefined;
  }
}
function writeLS(key: string, url: string | null) {
  try {
    localStorage.setItem(LS_PREFIX + key, url ?? "__none__");
  } catch {}
}

export function useAICategoryLogo(name: string | undefined, category: "movies" | "series" = "movies", enabled = true) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !name) {
      setUrl(null);
      return;
    }
    const key = `${category}:${name.toLowerCase().trim()}`;

    if (memCache.has(key)) {
      setUrl(memCache.get(key) ?? null);
      return;
    }
    const fromLS = readLS(key);
    if (fromLS !== undefined) {
      memCache.set(key, fromLS);
      setUrl(fromLS);
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (!inflight.has(key)) {
        inflight.set(
          key,
          (async () => {
            try {
              const { data, error } = await supabase.functions.invoke("resolve-category-logo", {
                body: { name, category },
              });
              if (error) return null;
              return (data?.url as string) ?? null;
            } catch {
              return null;
            }
          })()
        );
      }
      const resolved = await inflight.get(key)!;
      inflight.delete(key);
      memCache.set(key, resolved);
      writeLS(key, resolved);
      if (!cancelled) setUrl(resolved);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [name, category, enabled]);

  return url;
}
