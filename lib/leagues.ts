export interface LeagueTypefaces {
  heading?: string;
  display?: string;
  detail?: string;
}

export interface LeagueBrand {
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  onPrimaryColor: string;
  onSurfaceColor: string;
  mutedColor: string;
  typefaces?: LeagueTypefaces;
}

export interface LeagueConfig {
  key: string;
  label: string;
  sport: string;
  scoreboardUrl: string;
  brand: LeagueBrand;
}

export const LEAGUES = {
  wnba: {
    key: "wnba",
    label: "WNBA",
    sport: "Basketball",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard",
    brand: {
      primaryColor: "#f37021",
      secondaryColor: "#fdba74",
      surfaceColor: "#241a13",
      onPrimaryColor: "#0b0b0b",
      onSurfaceColor: "#fdf4ed",
      mutedColor: "#f4b98a",
      typefaces: {
        heading: "font-heading",
        display: "font-score",
        detail: "font-sans",
      },
    },
  },
  nwsl: {
    key: "nwsl",
    label: "NWSL",
    sport: "Soccer",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.nwsl/scoreboard",
    brand: {
      primaryColor: "#002d72",
      secondaryColor: "#7ea6e0",
      surfaceColor: "#111927",
      onPrimaryColor: "#f9fafb",
      onSurfaceColor: "#e2e8f0",
      mutedColor: "#94a3b8",
      typefaces: {
        heading: "font-heading",
        display: "font-score",
        detail: "font-sans",
      },
    },
  },
  pwhl: {
    key: "pwhl",
    label: "PWHL",
    sport: "Hockey",
    scoreboardUrl:
      "https://site.api.espn.com/apis/site/v2/sports/hockey/pwhl/scoreboard",
    brand: {
      primaryColor: "#00b5e2",
      secondaryColor: "#7fe3ff",
      surfaceColor: "#10242a",
      onPrimaryColor: "#04111b",
      onSurfaceColor: "#e6fbff",
      mutedColor: "#9ad9e8",
      typefaces: {
        heading: "font-heading",
        display: "font-score",
        detail: "font-sans",
      },
    },
  },
} satisfies Record<string, LeagueConfig>;

export type LeagueKey = keyof typeof LEAGUES;

export const DEFAULT_LEAGUE: LeagueKey = "wnba";

export function isLeagueKey(value: string): value is LeagueKey {
  return value in LEAGUES;
}
