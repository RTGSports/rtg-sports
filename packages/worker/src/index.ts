// packages/worker/src/index.ts

// ---------- Types ----------
type KVNamespace = {
  get(key: string, type?: "text" | "json" | "arrayBuffer"): Promise<any>;
  put(
    key: string,
    value: string | ArrayBuffer,
    options?: { expirationTtl?: number; metadata?: Record<string, any> }
  ): Promise<void>;
  delete(key: string): Promise<void>;
};

interface Env {
  RATE_LIMIT: KVNamespace;                 // KV for small caches
  SUPABASE_URL?: string;                   // for /news team feeds
  SUPABASE_ANON_KEY?: string;              // public anon key (SELECT only)
}

const VERSION = "rtg-web-apis-v2";

type LeagueKey = "wnba" | "nwsl" | "pwhl";

const NEXT_ORIGINS = new Set([
  "http://localhost:3000",
  "https://rtg-sports.vercel.app",
]);

const ESPN_SCOREBOARD_ENDPOINTS: Record<LeagueKey, string> = {
  wnba: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
  nwsl: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard",
  pwhl: "https://site.api.espn.com/apis/site/v2/sports/hockey/women.pwhl/scoreboard",
};

// ---------- Small helpers ----------
function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

function withCors(response: Response, request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && NEXT_ORIGINS.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.append("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

async function cachedJSON<T>(
  env: Env,
  key: string,
  ttlSec: number,
  producer: () => Promise<T>
): Promise<Response> {
  const kvKey = `cache:${key}`;
  const cached = await env.RATE_LIMIT.get(kvKey, "text");
  if (cached) {
    return new Response(cached, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-cache": "HIT",
      },
    });
  }
  const value = await producer();
  const body = JSON.stringify(value);
  await env.RATE_LIMIT.put(kvKey, body, { expirationTtl: ttlSec });
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-cache": "MISS",
    },
  });
}

function yyyymmdd(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchJson(url: string) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "RTG-Sports/0.1 (+workers.dev)",
      Accept: "application/json",
    },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

async function fetchText(url: string) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "RTG-Sports/0.1 (+workers.dev)",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1",
    },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.text();
}

function decode(x: string) {
  return x
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

type NewsItem = { title: string; link: string; pubDate?: string };

function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const src = xml;

  // RSS <item>
  {
    const entry = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = entry.exec(src))) {
      const block = m[1];

      const title =
        decode(
          block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ??
            block.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
            ""
        ).trim();

      const link =
        decode(
          block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] ??
            block.match(/<guid[^>]*>([^<]+)<\/guid>/i)?.[1] ??
            ""
        ).trim();

      const pub =
        block.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1]?.trim() ??
        block.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i)?.[1]?.trim();

      if (title && link) items.push({ title, link, pubDate: pub });
    }
  }

  // Atom <entry> (if no items yet)
  if (items.length === 0) {
    const entry = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    let m: RegExpExecArray | null;
    while ((m = entry.exec(src))) {
      const block = m[1];

      const title =
        decode(
          block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ??
            block.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
            ""
        ).trim();

      let link = "";
      const altHref =
        block.match(
          /<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i
        )?.[1] ??
        block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
      if (altHref) link = decode(altHref).trim();

      const pub =
        block.match(/<updated[^>]*>([^<]+)<\/updated>/i)?.[1]?.trim() ??
        block.match(/<published[^>]*>([^<]+)<\/published>/i)?.[1]?.trim();

      if (title && link) items.push({ title, link, pubDate: pub });
    }
  }

  // Fallback: derive link from description/content
  if (items.length === 0) {
    const entry = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = entry.exec(src))) {
      const block = m[1];
      const title =
        decode(
          block.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/i)?.[1] ??
            block.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
            ""
        ).trim();

      const desc =
        block.match(
          /<(description|content:encoded)[^>]*>([\s\S]*?)<\/\1>/i
        )?.[2] ?? "";
      const linkGuess = desc.match(/https?:\/\/[^\s"'<)]+/i)?.[0] ?? "";

      const pub =
        block.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1]?.trim() ??
        block.match(/<dc:date[^>]*>([^<]+)<\/dc:date>/i)?.[1]?.trim();

      if (title && linkGuess)
        items.push({ title, link: decode(linkGuess), pubDate: pub });
    }
  }

  // De-dupe by link
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)));
}

// ---------- ESPN adapter ----------
type RTGGame = {
  id: string;
  league: "wnba" | "nwsl";
  date: string; // ISO
  status: string; // "pre" | "in" | "post"
  period?: number;
  clock?: string | null;
  home: { code: string; name: string; score?: number | null };
  away: { code: string; name: string; score?: number | null };
  venue?: string | null;
  link?: string | null;
};

type ScoreboardTeam = {
  id: string | null;
  name: string;
  shortName: string;
  abbreviation: string;
  score: number | null;
};

type ScoreboardGame = {
  id: string;
  league: LeagueKey;
  startTime: string; // ISO
  status: {
    state: string;
    short: string;
    detail: string;
  };
  home: ScoreboardTeam;
  away: ScoreboardTeam;
};

function mapEspnStatus(s: any): { status: string; period?: number; clock?: string | null } {
  const type = s?.type?.state; // "pre" | "in" | "post"
  const period =
    typeof s?.period === "number"
      ? s.period
      : typeof s?.type?.detail === "number"
      ? s.type.detail
      : undefined;
  const clock = typeof s?.displayClock === "string" ? s.displayClock : null;
  return { status: type ?? "pre", period, clock };
}

function mapTeamName(team: any) {
  const abbr = team?.team?.abbreviation || team?.abbreviation || "";
  const display =
    team?.team?.displayName || team?.displayName || team?.team?.shortDisplayName || "";
  return { code: abbr, name: display };
}

function mapScoreboardTeam(competitor: any): ScoreboardTeam {
  const team = competitor?.team ?? competitor;
  const name =
    team?.displayName || team?.shortDisplayName || team?.name || team?.nickname || "";
  const shortName = team?.shortDisplayName || team?.abbreviation || name;
  const abbreviation = team?.abbreviation || team?.shortDisplayName || "";
  return {
    id: team?.id != null ? String(team.id) : null,
    name,
    shortName,
    abbreviation,
    score:
      typeof competitor?.score === "number"
        ? competitor.score
        : competitor?.score != null
        ? Number(competitor.score)
        : null,
  };
}

function normalizeEspnScoreboard(json: any, league: "wnba" | "nwsl"): RTGGame[] {
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.map((ev: any) => {
    const comp = ev?.competitions?.[0];
    const status = mapEspnStatus(comp?.status || ev?.status);
    const competitors = comp?.competitors || [];
    const homeC = competitors.find((c: any) => c?.homeAway === "home");
    const awayC = competitors.find((c: any) => c?.homeAway === "away");
    const venue = comp?.venue?.fullName || comp?.venue?.address?.city || null;
    const link =
      ev?.links?.[0]?.href ||
      comp?.tickets?.[0]?.links?.[0]?.href ||
      ev?.shortLink ||
      null;

    const home = {
      ...mapTeamName(homeC),
      score: homeC?.score != null ? Number(homeC.score) : null,
    };
    const away = {
      ...mapTeamName(awayC),
      score: awayC?.score != null ? Number(awayC.score) : null,
    };

    return {
      id: String(ev?.id ?? comp?.id ?? crypto.randomUUID()),
      league,
      date: ev?.date || comp?.date || new Date().toISOString(),
      status: status.status,
      period: status.period,
      clock: status.clock ?? null,
      home,
      away,
      venue,
      link,
    };
  });
}

function normalizeCompactScoreboard(json: any, league: LeagueKey): ScoreboardGame[] {
  const events = Array.isArray(json?.events) ? json.events : [];
  return events.map((ev: any) => {
    const comp = ev?.competitions?.[0];
    const competitors = comp?.competitors || [];
    const homeC = competitors.find((c: any) => c?.homeAway === "home") || competitors[0];
    const awayC = competitors.find((c: any) => c?.homeAway === "away") || competitors[1];
    const status = comp?.status?.type || ev?.status?.type || {};

    const state = typeof status?.state === "string" ? status.state : "pre";
    const short = typeof status?.shortDetail === "string" ? status.shortDetail : "";
    const detail = typeof status?.detail === "string" ? status.detail : short;

    const startTime = comp?.date || ev?.date || new Date().toISOString();

    return {
      id: String(ev?.id ?? comp?.id ?? crypto.randomUUID()),
      league,
      startTime,
      status: { state, short, detail },
      home: mapScoreboardTeam(homeC),
      away: mapScoreboardTeam(awayC),
    };
  });
}

// ---------- Router ----------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), request);
    }

    // Health/version
    if (path === "/__version") return withCors(json({ version: VERSION }), request);
    if (path === "/hello") return withCors(json({ message: "Hello from RTG Sports" }), request);

    if (path === "/scoreboard" && (request.method === "GET" || request.method === "HEAD")) {
      const leagueParam = (url.searchParams.get("league") || "wnba").toLowerCase();
      const league: LeagueKey = ["wnba", "nwsl", "pwhl"].includes(leagueParam)
        ? (leagueParam as LeagueKey)
        : "wnba";
      const date = url.searchParams.get("date");

      const params = new URLSearchParams();
      if (date) params.set("dates", date);
      const espnUrl = `${ESPN_SCOREBOARD_ENDPOINTS[league]}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      try {
        const espnJson = await fetchJson(espnUrl);
        const games = normalizeCompactScoreboard(espnJson, league);
        const hasLiveGame = games.some((g) => g.status.state === "in");
        const ttl = hasLiveGame ? 30 : 300;
        const response = json({
          league,
          date: date || espnJson?.day?.date || yyyymmdd(),
          fetchedAt: new Date().toISOString(),
          games,
          source: "espn" as const,
        });
        response.headers.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
        return withCors(response, request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
        return withCors(
          json({ error: "Failed to load scoreboard", league, message }, { status: 502 }),
          request
        );
      }
    }

    // ---- SCORES (ESPN) ----
    // GET /scores/live?league=wnba|nwsl&date=YYYYMMDD
    if (path === "/scores/live") {
      const leagueParam = (url.searchParams.get("league") || "wnba").toLowerCase();
      const league = (leagueParam === "nwsl" ? "nwsl" : "wnba") as "wnba" | "nwsl";
      const date = url.searchParams.get("date") || yyyymmdd();

      const espnUrl =
        league === "wnba"
          ? `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=${date}`
          : `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard?dates=${date}`;

      const cacheKey = `scores:${league}:${date}`;
      const result = await cachedJSON(env, cacheKey, 60, async () => {
        const jsonData = await fetchJson(espnUrl);
        const games = normalizeEspnScoreboard(jsonData, league);
        return { league, date, games, source: "espn" as const };
      });
      return withCors(result, request);
    }

    // ---- NEWS (league + optional team feeds from Supabase) ----
    // GET /news?league=wnba|nwsl[&team=CODE]
    if (path === "/news") {
      const league = (url.searchParams.get("league") || "wnba").toLowerCase();
      const team = url.searchParams.get("team")?.toUpperCase() || null;

      // Baseline league feeds
      const feeds: string[] = [];
      if (league === "nwsl") {
        // General soccer news (many teams publish their own feeds; we add those when present)
        feeds.push("https://www.espn.com/espn/rss/soccer/news");
      } else {
        // WNBA league + ESPN WNBA
        feeds.push(
          "https://www.wnba.com/news/feed/",
          "https://www.espn.com/espn/rss/wnba/news"
        );
      }

      // Add team-specific feeds from Supabase (public SELECT via anon key)
      if (team && env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
        try {
          const q = `${env.SUPABASE_URL}/rest/v1/team_feeds?league=eq.${league}&team_code=eq.${team}&active=eq.true&select=url`;
          const r = await fetch(q, {
            headers: {
              apikey: env.SUPABASE_ANON_KEY,
              Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            },
          });
          if (r.ok) {
            const rows = (await r.json()) as { url: string }[];
            for (const row of rows) if (row.url?.startsWith("http")) feeds.push(row.url);
          }
        } catch {
          // ignore; still return league feeds
        }
      }

      const cacheKey = `v5:news:${league}:${team || "all"}`;
      const result = await cachedJSON(env, cacheKey, 300, async () => {
        const results = await Promise.allSettled(feeds.map((f) => fetchText(f)));
        const items = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
          .flatMap((r) => parseFeed(r.value))
          .slice(0, 50);
        return { league, team, feeds, items };
      });
      return withCors(result, request);
    }

    // 404
    return withCors(json({ message: "Not Found", path }, { status: 404 }), request);
  },
};
