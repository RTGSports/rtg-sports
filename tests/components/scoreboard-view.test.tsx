import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import {
  GameCard,
  determineHighlight,
  withOpacity,
} from "@/components/scoreboard-view";
import { LEAGUES } from "@/lib/leagues";

test("withOpacity converts hex colors to rgba strings", () => {
  assert.equal(withOpacity("#ffffff", 0.5), "rgba(255, 255, 255, 0.500)");
  assert.equal(withOpacity("#123456", 1.2), "rgba(18, 52, 86, 1.000)");
  assert.equal(withOpacity("#zzz", 0.5), "#zzz");
});

test("determineHighlight only highlights leading teams with scores", () => {
  const subject = { score: 80 } as any;
  const opponent = { score: 70 } as any;
  assert.equal(determineHighlight(subject, opponent, "in"), true);
  assert.equal(determineHighlight(subject, opponent, "pre"), false);
  assert.equal(determineHighlight({ score: null } as any, opponent, "in"), false);
});

test("GameCard renders game context and broadcast information", () => {
  const brand = LEAGUES.wnba.brand;
  const markup = renderToStaticMarkup(
    <GameCard
      leagueKey="wnba"
      game={{
        id: "test",
        startTime: "2024-07-01T16:00:00Z",
        venue: "Seattle Center",
        broadcast: "ESPN",
        note: null,
        status: { state: "in", detail: "Q3", shortDetail: "Q3" },
        home: {
          id: "home",
          displayName: "Storm",
          shortDisplayName: "SEA",
          abbreviation: "SEA",
          logo: null,
          score: 72,
          record: "10-5",
          homeAway: "home",
        },
        away: {
          id: "away",
          displayName: "Aces",
          shortDisplayName: "LV",
          abbreviation: "LV",
          logo: null,
          score: 65,
          record: "11-4",
          homeAway: "away",
        },
      }}
    />
  );

  assert.match(markup, /Storm/);
  assert.match(markup, /Aces/);
  assert.match(markup, /ESPN/);
  assert.match(markup, new RegExp(brand.primaryColor.replace(/[#]/g, "[#]")));
});
