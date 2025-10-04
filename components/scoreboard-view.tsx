"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DEFAULT_LEAGUE,
  LEAGUES,
  type LeagueBrand,
  type LeagueKey,
} from "@/lib/leagues";
import { getStoredValue, setStoredValue } from "@/lib/client-storage";

interface ScoreboardResponse {
  league: LeagueKey;
  label: string;
  games: ScoreboardGame[];
  lastUpdated: string;
  refreshInterval: number;
  notice?: string;
  dates?: string[];
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

const SCOREBOARD_STORAGE_PREFIX = "rtg-scoreboard";

function getScoreboardStorageKey(league: LeagueKey) {
  return `${SCOREBOARD_STORAGE_PREFIX}:${league}`;
}

function postServiceWorkerMessage(message: unknown) {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !navigator.serviceWorker?.controller
  ) {
    return;
  }

  try {
    navigator.serviceWorker.controller.postMessage(message);
  } catch {
    // Ignore postMessage failures in unsupported browsers.
  }
}

export function ScoreboardView({ initialLeague = DEFAULT_LEAGUE }: ScoreboardViewProps) {
  const initialScoreboardRef = useRef<ScoreboardResponse | null | undefined>(
    undefined
  );
  const resolveInitialScoreboard = () => {
    if (initialScoreboardRef.current === undefined) {
      initialScoreboardRef.current = getStoredValue<ScoreboardResponse | null>(
        getScoreboardStorageKey(initialLeague),
        null
      );
    }

    return initialScoreboardRef.current ?? null;
  };

  const [selectedLeague, setSelectedLeague] = useState<LeagueKey>(initialLeague);
  const [data, setData] = useState<ScoreboardResponse | null>(() =>
    resolveInitialScoreboard()
  );
  const [loading, setLoading] = useState<boolean>(
    () => resolveInitialScoreboard() === null
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(
    () => resolveInitialScoreboard()?.refreshInterval ?? 180
  );
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const activeBrand = LEAGUES[selectedLeague].brand;

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

      const cacheKey = getScoreboardStorageKey(league);
      const cachedPayload = getStoredValue<ScoreboardResponse | null>(
        cacheKey,
        null
      );

      if (!background) {
        setError(null);
        setCacheNotice(null);
        setLoading(!cachedPayload);
      } else {
        setIsBackgroundRefresh(true);
      }

      try {
        const response = await fetch(`/api/scoreboard?league=${league}`, {
          cache: "default",
          signal,
        });

        if (!response.ok) {
          throw new Error(`Scoreboard request failed with status ${response.status}`);
        }

        const payload: ScoreboardResponse = await response.json();

        setStoredValue(cacheKey, payload);
        setData(payload);
        setRefreshInterval(payload.refreshInterval ?? 180);
        setError(null);
        setCacheNotice(null);
        setIsUsingCache(false);

        postServiceWorkerMessage({
          type: "RTG_SCOREBOARD_UPDATE",
          league,
          payload,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const fallbackPayload =
          cachedPayload ??
          getStoredValue<ScoreboardResponse | null>(cacheKey, null);

        if (fallbackPayload) {
          setData(fallbackPayload);
          setRefreshInterval((current) =>
            fallbackPayload.refreshInterval ?? current
          );
          setError(null);
          setCacheNotice("You’re offline. Showing saved scores.");
          setIsUsingCache(true);
        } else {
          setError("Unable to load the latest scores. Please try again in a moment.");
          setCacheNotice(null);
        }
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
    const cached = getStoredValue<ScoreboardResponse | null>(
      getScoreboardStorageKey(selectedLeague),
      null
    );

    if (cached) {
      setData(cached);
      setRefreshInterval(cached.refreshInterval ?? 180);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
      setRefreshInterval(180);
    }

    setError(null);
    setCacheNotice(null);
    setIsUsingCache(false);
    setIsBackgroundRefresh(false);

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

  const dateCoverageLabel = useMemo(() => {
    if (!data?.dates || data.dates.length === 0) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    });

    const normalizedDates = [...data.dates]
      .sort()
      .map((value) => {
        const candidate = value.length === 10 ? `${value}T00:00:00Z` : value;
        const parsed = new Date(candidate);
        if (Number.isNaN(parsed.getTime())) {
          return null;
        }

        return formatter.format(parsed);
      })
      .filter((value): value is string => Boolean(value));

    if (normalizedDates.length === 0) {
      return null;
    }

    if (normalizedDates.length === 1) {
      return normalizedDates[0];
    }

    return `${normalizedDates[0]} – ${normalizedDates[normalizedDates.length - 1]}`;
  }, [data?.dates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:gap-0">
          <nav className="-mx-4 sm:mx-0" aria-label="Select league scoreboard">
            <div
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-full border px-4 py-1 text-sm shadow-inner backdrop-blur sm:snap-none sm:overflow-visible sm:p-1"
              style={{
                borderColor: withOpacity(activeBrand.secondaryColor, 0.25),
                background: `linear-gradient(120deg, ${withOpacity(
                  activeBrand.surfaceColor,
                  0.85
                )} 0%, rgba(24, 27, 34, 0.7) 100%)`,
              }}
            >
              {leagues.map((league) => {
            const isActive = league.key === selectedLeague;
            const leagueBrand = LEAGUES[league.key].brand;
            const headingFont = leagueBrand.typefaces?.heading ?? "font-heading";
            const activeStyles: CSSProperties = isActive
              ? {
                  backgroundColor: leagueBrand.primaryColor,
                  borderColor: leagueBrand.primaryColor,
                  color: leagueBrand.onPrimaryColor,
                  boxShadow: `0 12px 32px -16px ${withOpacity(
                    leagueBrand.primaryColor,
                    0.75
                  )}`,
                }
              : {};
            const inactiveStyles: CSSProperties = !isActive
              ? {
                  borderColor: withOpacity(leagueBrand.secondaryColor, 0.35),
                  color: leagueBrand.secondaryColor,
                }
              : {};
                return (
                  <button
                    key={league.key}
                    type="button"
                    onClick={() => setSelectedLeague(league.key)}
                    className={`min-h-[44px] inline-flex flex-shrink-0 items-center justify-center rounded-full border px-4 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background snap-start ${headingFont}`}
                    style={{
                      ...inactiveStyles,
                      ...activeStyles,
                    }}
                    aria-pressed={isActive}
                  >
                    {league.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <div
            className="flex flex-wrap items-center gap-2 text-xs sm:hidden"
            style={{ color: withOpacity(activeBrand.mutedColor, 0.85) }}
            aria-live="polite"
          >
            {isUsingCache && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-200" aria-hidden />
                Offline
              </span>
            )}
            {isBackgroundRefresh && (
              <span
                className="inline-flex h-2 w-2 animate-ping rounded-full"
                style={{ backgroundColor: activeBrand.primaryColor }}
                aria-hidden
              />
            )}
            {data?.games && (
              <span>
                {data.games.length} game{data.games.length === 1 ? "" : "s"} • Updated {lastUpdatedLabel || "just now"}
              </span>
            )}
          </div>
        </div>
        <div
          className="hidden items-center gap-2 text-xs sm:flex"
          style={{ color: withOpacity(activeBrand.mutedColor, 0.85) }}
          aria-live="polite"
        >
          {isUsingCache && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-200" aria-hidden />
              Offline
            </span>
          )}
          {isBackgroundRefresh && (
            <span
              className="inline-flex h-2 w-2 animate-ping rounded-full"
              style={{ backgroundColor: activeBrand.primaryColor }}
              aria-hidden
            />
          )}
          {data?.games && (
            <span>
              {data.games.length} game{data.games.length === 1 ? "" : "s"} • Updated {lastUpdatedLabel || "just now"}
            </span>
          )}
        </div>
      </div>

      {cacheNotice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-200" aria-hidden />
          {cacheNotice}
        </div>
      )}

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
        <div className="space-y-3">
          {data.notice && (
            <p className="text-center text-sm text-muted">{data.notice}</p>
          )}
          <div className="rounded-2xl border border-white/5 bg-surface/60 px-6 py-10 text-center text-sm text-muted">
            {`We don't see any scheduled or live games for ${LEAGUES[selectedLeague].label}${
              dateCoverageLabel ? ` from ${dateCoverageLabel}` : ""
            }.`}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.games?.map((game) => (
          <GameCard key={game.id} game={game} leagueKey={selectedLeague} />
        ))}
      </div>
    </div>
  );
}

export function GameCard({
  game,
  leagueKey,
}: {
  game: ScoreboardGame;
  leagueKey: LeagueKey;
}) {
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

  const brand = LEAGUES[leagueKey].brand;
  const headingFont = brand.typefaces?.heading ?? "font-heading";
  const displayFont = brand.typefaces?.display ?? "font-score";
  const detailFont = brand.typefaces?.detail ?? "font-sans";
  const statusColor =
    game.status.state === "in"
      ? brand.primaryColor
      : game.status.state === "post"
      ? brand.secondaryColor
      : brand.mutedColor;

  const cardStyles: CSSProperties = {
    borderColor: withOpacity(brand.secondaryColor, 0.25),
    background: `linear-gradient(160deg, ${withOpacity(
      brand.surfaceColor,
      0.92
    )} 0%, rgba(24, 27, 34, 0.88) 70%)`,
    boxShadow: `0 18px 40px -24px ${withOpacity(brand.primaryColor, 0.55)}`,
  };

  const headerMutedColor = withOpacity(brand.mutedColor, 0.9);

  return (
    <article
      className="flex h-full flex-col justify-between rounded-3xl border bg-surface/80 p-6 backdrop-blur"
      style={cardStyles}
    >
      <header className="flex items-start justify-between text-xs" style={{ color: headerMutedColor }}>
        <div className="space-y-0.5">
          <p className={`${headingFont} text-sm`} style={{ color: brand.onSurfaceColor }}>
            {dateLabel}
          </p>
          <p className={detailFont}>{timeLabel}</p>
        </div>
        <p
          className={`${headingFont} text-right text-[0.65rem] font-semibold uppercase tracking-[0.35em]`}
          style={{ color: statusColor }}
        >
          {game.status.shortDetail}
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <TeamRow
          team={game.away}
          status={game.status.state}
          isHighlighted={determineHighlight(game.away, game.home, game.status.state)}
          brand={brand}
          headingFont={headingFont}
          displayFont={displayFont}
          detailFont={detailFont}
        />
        <TeamRow
          team={game.home}
          status={game.status.state}
          isHighlighted={determineHighlight(game.home, game.away, game.status.state)}
          brand={brand}
          headingFont={headingFont}
          displayFont={displayFont}
          detailFont={detailFont}
        />
      </div>

      <footer
        className={`mt-6 flex flex-wrap items-center justify-between gap-2 text-xs ${detailFont}`}
        style={{ color: withOpacity(brand.mutedColor, 0.75) }}
      >
        <span>{game.venue ?? "Venue TBA"}</span>
        {game.broadcast && (
          <span style={{ color: brand.secondaryColor }}>{game.broadcast}</span>
        )}
      </footer>
    </article>
  );
}

export function determineHighlight(
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
  brand,
  headingFont,
  displayFont,
  detailFont,
}: {
  team: TeamScore;
  status: "pre" | "in" | "post";
  isHighlighted: boolean;
  brand: LeagueBrand;
  headingFont: string;
  displayFont: string;
  detailFont: string;
}) {
  const displayScore = team.score !== null ? team.score : "--";
  const locationLabel = team.homeAway === "home" ? "Home" : "Away";

  const containerStyles: CSSProperties = {
    backgroundColor: isHighlighted
      ? brand.primaryColor
      : withOpacity(brand.surfaceColor, 0.9),
    borderColor: withOpacity(
      isHighlighted ? brand.primaryColor : brand.secondaryColor,
      isHighlighted ? 0.75 : 0.45
    ),
    color: isHighlighted ? brand.onPrimaryColor : brand.onSurfaceColor,
    boxShadow: isHighlighted
      ? `0 14px 30px -18px ${withOpacity(brand.primaryColor, 0.65)}`
      : undefined,
  };

  const metaColor = isHighlighted
    ? withOpacity(brand.onPrimaryColor, 0.75)
    : withOpacity(brand.mutedColor, 0.9);

  const recordColor = isHighlighted
    ? withOpacity(brand.onPrimaryColor, 0.65)
    : withOpacity(brand.mutedColor, 0.75);

  const scoreStyles: CSSProperties = isHighlighted
    ? {
        backgroundColor: brand.onPrimaryColor,
        borderColor: brand.onPrimaryColor,
        color: brand.primaryColor,
      }
    : {
        backgroundColor:
          status === "post"
            ? withOpacity(brand.secondaryColor, 0.18)
            : withOpacity(brand.secondaryColor, 0.12),
        borderColor: withOpacity(brand.secondaryColor, 0.45),
        color: brand.onSurfaceColor,
      };

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition"
      style={containerStyles}
    >
      <div className="flex flex-col">
        <span
          className={`${detailFont} text-[0.65rem] uppercase tracking-[0.35em]`}
          style={{ color: metaColor }}
        >
          {locationLabel}
        </span>
        <span className={`${headingFont} text-xl font-semibold`}>{team.displayName}</span>
        {team.record && (
          <span className={`${detailFont} text-xs`} style={{ color: recordColor }}>
            {team.record}
          </span>
        )}
      </div>
      <div
        className={`${displayFont} flex h-14 w-14 items-center justify-center rounded-xl border text-2xl font-semibold transition`}
        style={scoreStyles}
      >
        {displayScore}
      </div>
    </div>
  );
}

export function withOpacity(hexColor: string, opacity: number): string {
  const normalized = hexColor.replace("#", "").trim();

  if (normalized.length !== 6) {
    return hexColor;
  }

  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;

  const clamped = Math.min(1, Math.max(0, opacity));

  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(3)})`;
}
