"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LEAGUE, LEAGUES, LeagueKey } from "@/lib/leagues";

interface ScoreboardResponse {
  league: LeagueKey;
  label: string;
  games: ScoreboardGame[];
  lastUpdated: string;
  refreshInterval: number;
}

interface ScoreboardGame {
  id: string;
  startTime: string;
  venue: string | null;
  broadcast: string | null;
  note: string | null;
  status: {
    state: "pre" | "in" | "post";
    detail: string;
    shortDetail: string;
  };
  home: TeamScore;
  away: TeamScore;
}

interface TeamScore {
  id: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  logo: string | null;
  score: number | null;
  record: string | null;
  homeAway: "home" | "away";
}

interface ScoreboardViewProps {
  initialLeague?: LeagueKey;
}

export function ScoreboardView({ initialLeague = DEFAULT_LEAGUE }: ScoreboardViewProps) {
  const [selectedLeague, setSelectedLeague] = useState<LeagueKey>(initialLeague);
  const [data, setData] = useState<ScoreboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(180);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);

  const leagues = useMemo(
    () =>
      Object.values(LEAGUES).map((league) => ({
        key: league.key as LeagueKey,
        label: league.label,
      })),
    []
  );

  const loadScores = useCallback(
    async (
      league: LeagueKey,
      options: { background?: boolean; signal?: AbortSignal } = {}
    ) => {
      const { background = false, signal } = options;

      if (!background) {
        setLoading(true);
        setError(null);
      } else {
        setIsBackgroundRefresh(true);
      }

      try {
        const response = await fetch(`/api/scoreboard?league=${league}`, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Scoreboard request failed with status ${response.status}`);
        }

        const payload: ScoreboardResponse = await response.json();

        setData(payload);
        setRefreshInterval(payload.refreshInterval ?? 180);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        setError("Unable to load the latest scores. Please try again in a moment.");
      } finally {
        if (!background) {
          setLoading(false);
        }
        setIsBackgroundRefresh(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadScores(selectedLeague, { background: false, signal: controller.signal });

    return () => controller.abort();
  }, [selectedLeague, loadScores]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      loadScores(selectedLeague, { background: true }).catch(() => {
        /* handled in loadScores */
      });
    }, refreshInterval * 1000);

    return () => window.clearInterval(id);
  }, [loadScores, refreshInterval, selectedLeague]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.lastUpdated) {
      return "";
    }

    try {
      const updatedDate = new Date(data.lastUpdated);
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(updatedDate);
    } catch {
      return "";
    }
  }, [data?.lastUpdated]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-white/10 bg-surface/60 p-1 text-sm shadow-inner backdrop-blur">
          {leagues.map((league) => {
            const isActive = league.key === selectedLeague;
            return (
              <button
                key={league.key}
                type="button"
                onClick={() => setSelectedLeague(league.key)}
                className={`rounded-full px-4 py-2 font-medium transition ${
                  isActive
                    ? "bg-accent text-black shadow"
                    : "text-muted hover:text-white"
                }`}
              >
                {league.label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted">
          {isBackgroundRefresh && <span className="mr-2 inline-flex h-2 w-2 animate-ping rounded-full bg-accent" />}
          {data?.games && (
            <span>
              {data.games.length} game{data.games.length === 1 ? "" : "s"} • Updated {lastUpdatedLabel || "just now"}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-white/5 bg-surface/40"
            />
          ))}
        </div>
      )}

      {!loading && data?.games?.length === 0 && !error && (
        <div className="rounded-2xl border border-white/5 bg-surface/60 px-6 py-10 text-center text-sm text-muted">
          We don&apos;t see any scheduled or live games for {LEAGUES[selectedLeague].label} today.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.games?.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: ScoreboardGame }) {
  const startDate = useMemo(() => new Date(game.startTime), [game.startTime]);
  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(startDate);
    } catch {
      return "";
    }
  }, [startDate]);

  const timeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(startDate);
    } catch {
      return "";
    }
  }, [startDate]);

  const statusColor =
    game.status.state === "in"
      ? "text-accent"
      : game.status.state === "post"
      ? "text-white"
      : "text-muted";

  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-white/5 bg-surface/80 p-6 shadow-card backdrop-blur">
      <header className="flex items-start justify-between text-sm text-muted">
        <div>
          <p className="font-medium text-white">{dateLabel}</p>
          <p>{timeLabel}</p>
        </div>
        <p className={`text-right text-xs font-semibold uppercase ${statusColor}`}>
          {game.status.shortDetail}
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <TeamRow
          team={game.away}
          status={game.status.state}
          isHighlighted={determineHighlight(game.away, game.home, game.status.state)}
        />
        <TeamRow
          team={game.home}
          status={game.status.state}
          isHighlighted={determineHighlight(game.home, game.away, game.status.state)}
        />
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{game.venue ?? "Venue TBA"}</span>
        {game.broadcast && <span className="text-accent-200">{game.broadcast}</span>}
      </footer>
    </article>
  );
}

function determineHighlight(
  subject: TeamScore,
  opponent: TeamScore,
  status: "pre" | "in" | "post"
) {
  if (status === "pre") {
    return false;
  }

  if (subject.score === null || opponent.score === null) {
    return false;
  }

  return subject.score > opponent.score;
}

function TeamRow({
  team,
  status,
  isHighlighted,
}: {
  team: TeamScore;
  status: "pre" | "in" | "post";
  isHighlighted: boolean;
}) {
  const displayScore = team.score !== null ? team.score : "--";
  const locationLabel = team.homeAway === "home" ? "Home" : "Away";

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/20 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.4em] text-muted">{locationLabel}</span>
        <span className="text-lg font-semibold text-white">{team.displayName}</span>
        {team.record && <span className="text-xs text-muted">{team.record}</span>}
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-xl font-bold transition ${
          isHighlighted
            ? "bg-accent text-black"
            : status === "post"
            ? "bg-white/10 text-white"
            : "bg-black/40 text-white"
        }`}
      >
        {displayScore}
      </div>
    </div>
  );
}
