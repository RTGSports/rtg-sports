export const LEAGUES = {
  wnba: {
    key: "wnba",
    label: "WNBA",
    sport: "Basketball",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
  },
  nwsl: {
    key: "nwsl",
    label: "NWSL",
    sport: "Soccer",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard",
  },
  pwhl: {
    key: "pwhl",
    label: "PWHL",
    sport: "Hockey",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/hockey/pwhl/scoreboard",
  },
} as const;

export type LeagueKey = keyof typeof LEAGUES;

export const DEFAULT_LEAGUE: LeagueKey = "wnba";

export function isLeagueKey(value: string): value is LeagueKey {
  return value in LEAGUES;
}
