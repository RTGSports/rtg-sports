import { NextRequest } from "next/server";
import { DEFAULT_LEAGUE, LEAGUES, LeagueKey, isLeagueKey } from "@/lib/leagues";
import { mapEspnScoreboard } from "@/lib/scoreboard";

const MINIMUM_SCHEDULED_GAMES = 4;
const MAX_ADDITIONAL_DATES = 2;

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
      if ([204, 404].includes(response.status)) {
        const payload = mapEspnScoreboard({ events: [] }, leagueKey);
        const notice =
          response.status === 204
            ? "ESPN hasn't published scoreboard data for this league yet today."
            : "ESPN's scoreboard feed for this league isn't available right now. We'll keep checking for updates.";

        return Response.json(
          { ...payload, notice, dates: [] },
          {
            headers: {
              "Cache-Control": `public, s-maxage=${payload.refreshInterval}, stale-while-revalidate=60`,
            },
          }
        );
      }

      return Response.json(
        { error: ERROR_MESSAGE, status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const requestedDates = new Set<string>();
    extractInitialDates(data).forEach((date) => requestedDates.add(date));

    let aggregatedEvents = Array.isArray(data?.events) ? [...data.events] : [];
    let payload = mapEspnScoreboard(data, leagueKey);

    if (payload.games.length < MINIMUM_SCHEDULED_GAMES) {
      const additionalDates = extractNextCalendarDates(data, requestedDates)
        .filter((date) => !requestedDates.has(date))
        .slice(0, MAX_ADDITIONAL_DATES);

      if (additionalDates.length > 0) {
        await Promise.allSettled(
          additionalDates.map(async (date) => {
            try {
              requestedDates.add(date);
              const extraResponse = await fetch(
                `${leagueConfig.scoreboardUrl}?dates=${date}`,
                {
                  cache: "no-store",
                  headers: {
                    "User-Agent": "rtg-sports/1.0 (https://github.com/)",
                  },
                }
              );

              if (!extraResponse.ok) {
                return;
              }

              const extraData = await extraResponse.json();
              const extraEvents = Array.isArray(extraData?.events)
                ? extraData.events
                : [];

              aggregatedEvents.push(...extraEvents);
            } catch {
              // Ignore network failures when attempting to extend the slate.
            }
          })
        );

        if (aggregatedEvents.length !== (Array.isArray(data?.events) ? data.events.length : 0)) {
          payload = mapEspnScoreboard(
            { ...data, events: aggregatedEvents },
            leagueKey
          );
        }
      }
    }

    const dates = Array.from(requestedDates).sort();

    return Response.json(
      { ...payload, dates },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${payload.refreshInterval}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: ERROR_MESSAGE, detail: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}

function extractInitialDates(data: any): string[] {
  const dates = new Set<string>();

  const dayDate = normalizeDateValue(data?.day?.date ?? data?.day?.startDate);
  if (dayDate) {
    dates.add(dayDate);
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  for (const event of events) {
    const eventDate = normalizeDateValue(
      event?.competitions?.[0]?.date ?? event?.date
    );
    if (eventDate) {
      dates.add(eventDate);
    }
  }

  return Array.from(dates);
}

function extractNextCalendarDates(data: any, existing: Set<string>): string[] {
  const dates = new Set<string>();

  const nextDay = normalizeDateValue(data?.day?.next ?? data?.day?.endDate);
  if (nextDay && !existing.has(nextDay)) {
    dates.add(nextDay);
  }

  const leagues = Array.isArray(data?.leagues) ? data.leagues : [];
  const calendar = leagues?.[0]?.calendar;

  const calendarEntries = Array.isArray(calendar) ? calendar : [];
  for (const entry of calendarEntries) {
    gatherCalendarDates(entry, dates, existing);
  }

  return Array.from(dates).sort();
}

function gatherCalendarDates(entry: any, dates: Set<string>, existing: Set<string>) {
  if (!entry || typeof entry !== "object") {
    return;
  }

  const candidate =
    normalizeDateValue(entry?.value ?? entry?.startDate ?? entry?.date ?? entry?.label) ??
    null;

  if (candidate && !existing.has(candidate)) {
    dates.add(candidate);
  }

  const nestedEntries = Array.isArray(entry?.entries) ? entry.entries : [];
  for (const nested of nestedEntries) {
    gatherCalendarDates(nested, dates, existing);
  }
}

function normalizeDateValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}
