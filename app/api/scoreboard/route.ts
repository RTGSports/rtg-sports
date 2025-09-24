import { NextRequest } from "next/server";
import { DEFAULT_LEAGUE, LEAGUES, LeagueKey, isLeagueKey } from "@/lib/leagues";
import { mapEspnScoreboard } from "@/lib/scoreboard";

const ERROR_MESSAGE = "We couldn't reach the ESPN scoreboard feed right now.";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLeague = (searchParams.get("league") ?? DEFAULT_LEAGUE).toLowerCase();

  if (!isLeagueKey(requestedLeague)) {
    return Response.json(
      { error: `Unsupported league: ${requestedLeague}` },
      { status: 400 }
    );
  }

  const leagueKey = requestedLeague as LeagueKey;
  const leagueConfig = LEAGUES[leagueKey];

  try {
    const response = await fetch(leagueConfig.scoreboardUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "rtg-sports/1.0 (https://github.com/)",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: ERROR_MESSAGE, status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const payload = mapEspnScoreboard(data, leagueKey);

    return Response.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${payload.refreshInterval}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: ERROR_MESSAGE, detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
