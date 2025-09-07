// packages/worker/src/index.ts

// Bump this to see deploys easily at /__version
const VERSION = "rtg-2025-09-07-v1";

export interface Env {
  RATE_LIMIT: KVNamespace; // KV binding for rate limit + small caches
  APP_NAME?: string;
}

/* ----------------- Helpers ----------------- */

function getClientKey(req: Request) {
  // Prefer Cloudflare's client IP header
  return req.headers.get("CF-Connecting-IP") || "0.0.0.0";
}

// Sliding-window-ish limiter: `limit` requests per `windowSec` seconds per key
async function rateLimit(env: Env, key: string, limit = 120, windowSec = 60) {
  try {
    const bucketKey = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const current = (await env.RATE_LIMIT.get(bucketKey)) || "0";
    const count = parseInt(current, 10) || 0;
    if (count >= limit) return false;
    await env.RATE_LIMIT.put(bucketKey, String(count + 1), { expirationTtl: windowSec + 5 });
  } catch {
    // KV not bound? Fail open for now.
  }
  return true;
}

// Tiny JSON/text cache in KV
async function cached(env: Env, key: string, ttlSec: number, fetcher: () => Promise<Response>) {
  try {
    const hit = await env.RATE_LIMIT.get(`cache:${key}`);
    if (hit) {
      // Try to detect if content is JSON; default to JSON since we mostly cache JSON here.
      const isJson = hit.trim().startsWith("{") || hit.trim().startsWith("[");
      return new Response(hit, {
        headers: {
          "Content-Type": isJson ? "application/json" : "text/plain; charset=utf-8",
          "Cache-Control": `max-age=${ttlSec}`,
          "X-RTG-Version": VERSION
        }
      });
    }
    const res = await fetcher();
    const body = await res.text();
    await env.RATE_LIMIT.put(`cache:${key}`, body, { expirationTtl: ttlSec });
    return new Response(body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": `max-age=${ttlSec}`,
        "X-RTG-Version": VERSION
      }
    });
  } catch {
    // On cache failure, just return live
    const res = await fetcher();
    return new Response(await res.text(), {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "X-RTG-Version": VERSION
      }
    });
  }
}

// Fetch a URL and return text, throwing if not ok
async function fetchText(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return await res.text();
}

/* --------------- Request Handler --------------- */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Health/hello
    if (url.pathname === "/hello") {
      return Response.json(
        { message: `Hello from ${env.APP_NAME || "RTG Sports"}`, version: VERSION },
        { headers: { "X-RTG-Version": VERSION } }
      );
    }

    // Version helper
    if (url.pathname === "/__version") {
      return new Response(VERSION, { headers: { "X-RTG-Version": VERSION } });
    }

    // Mock scores (rate-limited + cached 60s)
    if (url.pathname === "/scores/mock") {
      const ip = getClientKey(req);
      const ok = await rateLimit(env, ip, 120, 60); // 120 req/min/IP
      if (!ok) return new Response("Too Many Requests", { status: 429 });

      return cached(env, "scores:mock:today", 60, async () => {
        const data = {
          date: new Date().toISOString().slice(0, 10),
          leagues: {
            wnba: [{ home: "Aces", away: "Liberty", status: "Final", score: "78-73" }],
            nwsl: [{ home: "Thorns", away: "Wave", status: "Today 7:00 PM", score: null }]
          }
        };
        return Response.json(data);
      });
    }

    // News (RSS) — cached 5 minutes
// News (RSS) — cached 5 minutes, with optional team feeds from Supabase
if (url.pathname === "/news") {
  const league = (url.searchParams.get("league") || "wnba").toLowerCase();
  const team = url.searchParams.get("team"); // optional

  // Baseline league feeds (kept simple for MVP)
  const feeds: string[] = [];
  if (league === "nwsl") {
    feeds.push(
      "https://www.espn.com/espn/rss/soccer/news"
    );
  } else {
    feeds.push(
      "https://www.wnba.com/news/feed/",
      "https://www.espn.com/espn/rss/wnba/news"
    );
  }

  // Pull team-specific feeds from Supabase (public SELECT via anon key)
  if (team) {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = env as unknown as {
        SUPABASE_URL: string; SUPABASE_ANON_KEY: string;
      };

      const q = new URL(
        `${SUPABASE_URL}/rest/v1/team_feeds?league=eq.${league}&team_code=eq.${team}&active=eq.true&select=url`
      );
      const r = await fetch(q.toString(), {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (r.ok) {
        const rows = await r.json() as { url: string }[];
        for (const row of rows) {
          if (row.url && /^https?:\/\//i.test(row.url)) feeds.push(row.url);
        }
      }
    } catch {
      // If Supabase fetch fails, just continue with league feeds
    }
  }

  const cacheKey = `news:${league}:${team || "all"}`;
  return cached(env, cacheKey, 300, async () => {
    const xmls = await Promise.allSettled(feeds.map((f) => fetchText(f)));
    const items: { title: string; link: string; pubDate?: string }[] = [];

    for (const r of xmls) {
      if (r.status !== "fulfilled") continue;
      const xml = r.value;

      const entryRegex = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      while ((m = entryRegex.exec(xml))) {
        const block = m[1];

        const title =
          (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
            block.match(/<title>([^<]+)<\/title>/)?.[1] ??
            "").trim();

        const link =
          (block.match(/<link>([^<]+)<\/link>/)?.[1] ??
            block.match(/<guid.*?>([^<]+)<\/guid>/)?.[1] ??
            "").trim();

        const pub =
          block.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]?.trim();

        if (title && link) items.push({ title, link, pubDate: pub });
      }
    }

    const seen = new Set<string>();
    const deduped = items
      .filter(i => (seen.has(i.link) ? false : (seen.add(i.link), true)))
      .slice(0, 50);

    return Response.json({ league, team: team || null, feeds, items: deduped });
  });
}

    // Fallback
    return new Response("Not Found", { status: 404, headers: { "X-RTG-Version": VERSION } });
  }
} satisfies ExportedHandler<Env>;// trigger
