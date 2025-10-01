import test from "node:test";
import assert from "node:assert/strict";

import { LEAGUES, isLeagueKey, DEFAULT_LEAGUE } from "@/lib/leagues";

test("DEFAULT_LEAGUE points to a configured league", () => {
  assert.ok(DEFAULT_LEAGUE in LEAGUES);
  const config = LEAGUES[DEFAULT_LEAGUE];
  assert.equal(config.label, "WNBA");
});

test("isLeagueKey identifies valid keys", () => {
  assert.equal(isLeagueKey("wnba"), true);
  assert.equal(isLeagueKey("invalid"), false);
});
