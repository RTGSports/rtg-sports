import { LEAGUES, LeagueKey } from "./leagues";

type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
};

type EspnCompetition = {
  id?: string;
  date?: string;
  venue?: { fullName?: string };
  attendance?: number;
  broadcasts?: { names?: string[] }[];
  notes?: { headline?: string; type?: string }[];
  competitors?: EspnCompetitor[];
  status?: {
    type?: {
      state?: string;
      shortDetail?: string;
      detail?: string;
      description?: string;
    };
  };
};

type EspnCompetitor = {
  id?: string;
  homeAway?: "home" | "away" | string;
  score?: string | number;
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
    logos?: { href?: string }[];
  };
  records?: { summary?: string; type?: string }[];
};

export interface TeamScore {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  logo: string | null;
  score: number | null;
  record: string | null;
  homeAway: "home" | "away";
}

export interface GameStatus {
  state: "pre" | "in" | "post";
  detail: string;
  shortDetail: string;
}

export interface ScoreboardGame {
  id: string;
  startTime: string;
  venue: string | null;
  broadcast: string | null;
  note: string | null;
  status: GameStatus;
  home: TeamScore;
  away: TeamScore;
}

export interface ScoreboardPayload {
  league: LeagueKey;
  label: string;
  games: ScoreboardGame[];
  lastUpdated: string;
  refreshInterval: number;
}

const LIVE_REFRESH_INTERVAL = 30; // seconds
const DEFAULT_REFRESH_INTERVAL = 180; // seconds

export function mapEspnScoreboard(raw: any, league: LeagueKey): ScoreboardPayload {
  const events: EspnEvent[] = dedupeAndSortEvents(Array.isArray(raw?.events) ? raw.events : []);

  const games = events
    .map((event) => transformEventToGame(event))
    .filter((game): game is ScoreboardGame => Boolean(game))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const refreshInterval = games.some((game) => game.status.state === "in")
    ? LIVE_REFRESH_INTERVAL
    : DEFAULT_REFRESH_INTERVAL;

  return {
    league,
    label: LEAGUES[league].label,
    games,
    lastUpdated: new Date().toISOString(),
    refreshInterval,
  };
}

function transformEventToGame(event: EspnEvent): ScoreboardGame | null {
  const competition = event?.competitions?.[0];
  if (!competition) {
    return null;
  }

  const status = normalizeStatus(competition?.status);
  const competitors = competition?.competitors ?? [];
  const homeComp = competitors.find((comp) => comp?.homeAway === "home");
  const awayComp = competitors.find((comp) => comp?.homeAway === "away");

  if (!homeComp || !awayComp) {
    return null;
  }

  const home = normalizeTeam(homeComp, "home");
  const away = normalizeTeam(awayComp, "away");

  return {
    id: competition?.id ?? event?.id ?? generateFallbackId(),
    startTime: competition?.date ?? event?.date ?? new Date().toISOString(),
    venue: competition?.venue?.fullName ?? null,
    broadcast: competition?.broadcasts?.[0]?.names?.[0] ?? null,
    note: competition?.notes?.[0]?.headline ?? null,
    status,
    home,
    away,
  };
}

function normalizeStatus(status: EspnCompetition["status"]): GameStatus {
  const state = status?.type?.state?.toLowerCase() ?? "pre";
  const detail = status?.type?.detail ?? status?.type?.description ?? "Scheduled";
  const shortDetail =
    status?.type?.shortDetail ?? status?.type?.detail ?? status?.type?.description ?? "TBD";

  let normalizedState: GameStatus["state"] = "pre";
  if (state.includes("in")) {
    normalizedState = "in";
  } else if (state.includes("post") || state.includes("final")) {
    normalizedState = "post";
  }

  return {
    state: normalizedState,
    detail,
    shortDetail,
  };
}

function normalizeTeam(competitor: EspnCompetitor, homeAway: "home" | "away"): TeamScore {
  const team = competitor?.team ?? {};
  const logo = team.logo ?? team.logos?.[0]?.href ?? null;
  const scoreValue = typeof competitor?.score === "number"
    ? competitor.score
    : competitor?.score
    ? Number.parseInt(competitor.score, 10)
    : null;

  const record = competitor?.records?.find((record) => record?.type === "total")?.summary ??
    competitor?.records?.[0]?.summary ??
    null;

  return {
    id: team?.id ?? competitor?.id ?? generateFallbackId(),
    displayName: team?.displayName ?? team?.shortDisplayName ?? "TBD",
    shortDisplayName: team?.shortDisplayName ?? team?.displayName ?? "",
    abbreviation: team?.abbreviation ?? team?.shortDisplayName ?? "",
    logo,
    score: Number.isFinite(scoreValue) ? (scoreValue as number) : null,
    record,
    homeAway,
  };
}

function generateFallbackId() {
  return `game-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function dedupeAndSortEvents(events: EspnEvent[]): EspnEvent[] {
  const seen = new Map<string, EspnEvent>();
  const withUnknownId: EspnEvent[] = [];

  for (const event of events) {
    const identifier = getEventIdentifier(event);

    if (!identifier) {
      withUnknownId.push(event);
      continue;
    }

    if (!seen.has(identifier)) {
      seen.set(identifier, event);
    }
  }

  const uniqueEvents = [...seen.values(), ...withUnknownId];

  return uniqueEvents.sort((a, b) => getEventTime(a) - getEventTime(b));
}

function getEventIdentifier(event: EspnEvent): string | null {
  const competitionId = event?.competitions?.[0]?.id;
  if (competitionId) {
    return `competition:${competitionId}`;
  }

  const eventId = event?.id;
  if (eventId) {
    return `event:${eventId}`;
  }

  return null;
}

function getEventTime(event: EspnEvent): number {
  const rawDate =
    event?.competitions?.[0]?.date ?? event?.date ?? new Date().toISOString();

  const parsed = Date.parse(rawDate);
  if (Number.isNaN(parsed)) {
    return Number.POSITIVE_INFINITY;
  }

  return parsed;
}
