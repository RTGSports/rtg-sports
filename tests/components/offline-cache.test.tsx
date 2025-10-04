import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import React from "react";

import { ScoreboardView } from "@/components/scoreboard-view";
import { NewsPanel } from "@/components/news-panel";

let render: any;
let screen: any;
let cleanup: any;
let jsdomWindow: (Window & typeof globalThis) | null = null;
let testingLibraryReady = true;

try {
  const { JSDOM } = await import("jsdom");
  ({ render, screen, cleanup } = await import("@testing-library/react"));

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  jsdomWindow = dom.window as unknown as Window & typeof globalThis;

  Object.assign(globalThis, {
    window: jsdomWindow,
    document: jsdomWindow.document,
    navigator: jsdomWindow.navigator,
    HTMLElement: jsdomWindow.HTMLElement,
    localStorage: jsdomWindow.localStorage,
  });
} catch {
  testingLibraryReady = false;
}

if (!testingLibraryReady || !jsdomWindow) {
  test("offline smoke tests require jsdom", { skip: true }, () => {});
} else {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jsdomWindow!.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  test("ScoreboardView renders cached scores when fetch fails", async () => {
    const cachedScoreboard = {
      league: "wnba",
      label: "WNBA",
      games: [
        {
          id: "game-1",
          startTime: new Date().toISOString(),
          venue: "Seattle Center",
          broadcast: "ESPN",
          note: null,
          status: { state: "post", detail: "Final", shortDetail: "Final" },
          home: {
            id: "home",
            displayName: "Storm",
            shortDisplayName: "SEA",
            abbreviation: "SEA",
            logo: null,
            score: 85,
            record: "10-4",
            homeAway: "home",
          },
          away: {
            id: "away",
            displayName: "Aces",
            shortDisplayName: "LVA",
            abbreviation: "LVA",
            logo: null,
            score: 80,
            record: "9-5",
            homeAway: "away",
          },
        },
      ],
      lastUpdated: new Date().toISOString(),
      refreshInterval: 120,
    } satisfies Record<string, unknown>;

    jsdomWindow!.localStorage.setItem(
      "rtg-scoreboard:wnba",
      JSON.stringify(cachedScoreboard)
    );

    globalThis.fetch = async () => {
      throw new Error("Network offline");
    };

    render(<ScoreboardView initialLeague="wnba" />);

    await screen.findByText("Storm");
    const notice = await screen.findByText(/saved scores/i);

    assert.ok(notice, "Expected offline notice to appear");
  });

  test("NewsPanel renders cached headlines when fetch fails", async () => {
    const cachedNews = {
      articles: [
        {
          id: "headline-1",
          title: "Storm clinch playoff berth",
          summary: "Seattle secures a postseason slot with a statement win.",
          league: "wnba",
          publishedAt: new Date().toISOString(),
          author: "RTG Desk",
          url: "https://example.test/article",
        },
      ],
      refreshInterval: 90,
    } satisfies Record<string, unknown>;

    jsdomWindow!.localStorage.setItem("rtg-news", JSON.stringify(cachedNews));

    globalThis.fetch = async () => {
      throw new Error("Network offline");
    };

    render(<NewsPanel />);

    await screen.findByText(/Storm clinch playoff berth/i);
    const notice = await screen.findByText(/saved headlines/i);

    assert.ok(notice, "Expected cached headline notice to appear");
  });
}
