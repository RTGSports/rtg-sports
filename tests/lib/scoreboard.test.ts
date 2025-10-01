import test from "node:test";
import assert from "node:assert/strict";

import { mapEspnScoreboard } from "@/lib/scoreboard";

const ORIGINAL_RANDOM = Math.random;
const ORIGINAL_DATE_NOW = Date.now;

test("mapEspnScoreboard normalizes events and sorts them chronologically", () => {
  Math.random = () => 0.123456789;
  Date.now = () => new Date("2024-07-01T12:00:00Z").getTime();

  try {
    const result = mapEspnScoreboard(
    {
      events: [
        {
          id: "event-2",
          date: "2024-07-01T18:00:00Z",
          competitions: [
            {
              id: "game-b",
              date: "2024-07-01T18:00:00Z",
              venue: { fullName: "Arena B" },
              broadcasts: [{ names: ["CBSSN"] }],
              notes: [{ headline: "Semifinal" }],
              status: { type: { state: "pre", detail: "Scheduled", shortDetail: "6:00 PM" } },
              competitors: [
                {
                  id: "home-b",
                  homeAway: "home",
                  score: "70",
                  team: {
                    id: "home-team-b",
                    displayName: "Home B",
                    shortDisplayName: "HB",
                    abbreviation: "HB",
                    logo: "home-b.png",
                  },
                  records: [{ type: "total", summary: "10-5" }],
                },
                {
                  id: "away-b",
                  homeAway: "away",
                  score: 65,
                  team: {
                    id: "away-team-b",
                    displayName: "Away B",
                    shortDisplayName: "AB",
                    abbreviation: "AB",
                    logos: [{ href: "away-b.png" }],
                  },
                  records: [{ summary: "9-6" }],
                },
              ],
            },
          ],
        },
        {
          id: "event-1",
          date: "2024-07-01T16:00:00Z",
          competitions: [
            {
              id: "game-a",
              date: "2024-07-01T16:00:00Z",
              venue: { fullName: "Arena A" },
              broadcasts: [{ names: ["ESPN"] }],
              status: { type: { state: "in", detail: "Q4", shortDetail: "Q4" } },
              competitors: [
                {
                  id: "home-a",
                  homeAway: "home",
                  score: "82",
                  team: {
                    id: "home-team-a",
                    displayName: "Home A",
                    shortDisplayName: "HA",
                    abbreviation: "HA",
                  },
                },
                {
                  id: "away-a",
                  homeAway: "away",
                  score: "80",
                  team: {
                    id: "away-team-a",
                    displayName: "Away A",
                    shortDisplayName: "AA",
                    abbreviation: "AA",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    "wnba"
  );

    assert.equal(result.games.length, 2);
    assert.equal(result.games[0]?.id, "game-a");
    assert.equal(result.games[1]?.id, "game-b");
    assert.equal(result.games[0]?.home.score, 82);
    assert.equal(result.games[0]?.away.logo, null);
    assert.equal(result.refreshInterval, 30);
    assert.ok(!Number.isNaN(Date.parse(result.lastUpdated)));
  } finally {
    Math.random = ORIGINAL_RANDOM;
    Date.now = ORIGINAL_DATE_NOW;
  }
});

test("mapEspnScoreboard filters out incomplete competitions", () => {
  Math.random = () => 0.5;
  Date.now = () => new Date("2024-07-01T12:00:00Z").getTime();

  try {
    const result = mapEspnScoreboard(
    {
      events: [
        {
          id: "incomplete",
          competitions: [
            {
              id: "missing-away",
              competitors: [
                { id: "home", homeAway: "home", team: { id: "h" } },
              ],
            },
          ],
        },
      ],
    },
    "wnba"
  );

    assert.equal(result.games.length, 0);
    assert.equal(result.refreshInterval, 180);
  } finally {
    Math.random = ORIGINAL_RANDOM;
    Date.now = ORIGINAL_DATE_NOW;
  }
});
