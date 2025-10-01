export type SupportedLeague = "wnba" | "nwsl" | "pwhl";

export interface NormalizedNewsArticle {
  id: string;
  title: string;
  summary: string;
  league: SupportedLeague;
  publishedAt: string;
  author?: string;
  url: string;
}

interface EspnLink {
  href?: string;
}

interface EspnArticle {
  id?: string | number;
  guid?: string;
  headline?: string;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  subtitle?: string;
  shortHeadline?: string;
  byline?: string;
  published?: string;
  publishedAt?: string;
  lastModified?: string;
  updated?: string;
  created?: string;
  displayDate?: string;
  link?: string;
  href?: string;
  links?: {
    web?: EspnLink;
    mobile?: EspnLink;
  };
}

interface EspnNewsPayload {
  articles?: EspnArticle[];
  headlines?: EspnArticle[];
}

const DEFAULT_PUBLISHED_AT = () => new Date().toISOString();

const LEAGUE_ENDPOINTS: Record<SupportedLeague, string> = {
  wnba: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/news",
  nwsl: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/news",
  pwhl: "https://site.api.espn.com/apis/site/v2/sports/hockey/pwhl/news",
};

function parseDate(value?: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return DEFAULT_PUBLISHED_AT();
}

function extractUrl(article: EspnArticle): string | null {
  const candidates = [
    article.links?.web?.href,
    article.links?.mobile?.href,
    article.link,
    article.href,
  ];

  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0) ?? null;
}

function cleanText(value?: string): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function normalizeByline(byline?: string): string | undefined {
  const cleaned = cleanText(byline);
  if (!cleaned) {
    return undefined;
  }
  return cleaned.replace(/^by\s+/i, "").trim() || undefined;
}

function articleId(article: EspnArticle, fallbackUrl: string, league: SupportedLeague, index: number): string {
  const rawId = article.id ?? article.guid ?? `${league}-${index}-${fallbackUrl}`;
  return String(rawId);
}

export async function fetchLeagueNews(league: SupportedLeague): Promise<NormalizedNewsArticle[]> {
  const endpoint = LEAGUE_ENDPOINTS[league];

  if (!endpoint) {
    return [];
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as EspnNewsPayload;
    const rawArticles = Array.isArray(payload.articles)
      ? payload.articles
      : Array.isArray(payload.headlines)
        ? payload.headlines
        : [];

    return rawArticles
      .map((article, index) => {
        const url = extractUrl(article);
        if (!url) {
          return null;
        }

        const title = cleanText(
          article.headline ?? article.title ?? article.name ?? article.shortHeadline ?? article.summary ?? url,
        );
        const summary = cleanText(article.description ?? article.summary ?? article.subtitle);
        const publishedAt = parseDate(
          article.published ?? article.publishedAt ?? article.lastModified ?? article.updated ?? article.created ?? article.displayDate,
        );
        const author = normalizeByline(article.byline);

        return {
          id: articleId(article, url, league, index),
          title: title || url,
          summary,
          league,
          publishedAt,
          author,
          url,
        } satisfies NormalizedNewsArticle;
      })
      .filter((article): article is NormalizedNewsArticle => Boolean(article));
  } catch (error) {
    console.error(`Failed to load ${league.toUpperCase()} news`, error);
    return [];
  }
}
