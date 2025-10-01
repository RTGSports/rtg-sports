import { NextResponse } from "next/server";

import { fetchLeagueNews, type NormalizedNewsArticle, type SupportedLeague } from "@/lib/news";

const LEAGUES: SupportedLeague[] = ["wnba", "nwsl", "pwhl"];
const REFRESH_INTERVAL_SECONDS = 300;

export async function GET() {
  const leagueResults = await Promise.allSettled(LEAGUES.map((league) => fetchLeagueNews(league)));

  const deduped = new Map<string, NormalizedNewsArticle>();

  for (const result of leagueResults) {
    if (result.status !== "fulfilled") {
      console.error("Failed to load league news", result.reason);
      continue;
    }

    for (const article of result.value) {
      const dedupeKey = article.url ?? article.id;
      if (!deduped.has(dedupeKey)) {
        deduped.set(dedupeKey, article);
      }
    }
  }

  const articles = Array.from(deduped.values()).sort((a, b) => {
    const aTime = Date.parse(a.publishedAt);
    const bTime = Date.parse(b.publishedAt);
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
      return 0;
    }
    if (Number.isNaN(aTime)) {
      return 1;
    }
    if (Number.isNaN(bTime)) {
      return -1;
    }
    return bTime - aTime;
  });

  return NextResponse.json({
    articles,
    refreshInterval: REFRESH_INTERVAL_SECONDS,
  });
}
