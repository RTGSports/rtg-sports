import assert from "node:assert/strict";
import test from "node:test";

import { fetchLeagueNews } from "@/lib/news";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_DATE = Date;

function mockFetchOnce(payload: unknown, init?: { status?: number }) {
  global.fetch = async () =>
    new Response(JSON.stringify(payload), {
      status: init?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
}

function restoreFetch() {
  global.fetch = ORIGINAL_FETCH;
}

function withFixedDate(value: string) {
  class FixedDate extends ORIGINAL_DATE {
    constructor(dateValue?: number | string | Date) {
      if (dateValue !== undefined) {
        super(dateValue);
      } else {
        super(value);
      }
    }

    static now() {
      return new ORIGINAL_DATE(value).getTime();
    }
  }

  global.Date = FixedDate as unknown as typeof Date;
}

function restoreDate() {
  global.Date = ORIGINAL_DATE;
}

test("fetchLeagueNews normalizes ESPN headlines", async (t) => {
  t.afterEach(() => {
    restoreFetch();
    restoreDate();
  });

  mockFetchOnce({
    headlines: [
      {
        id: "12345",
        headline: "Ace guards lead Game 1 charge",
        description: "The defending champions set the tone early in the Finals.",
        published: "2024-09-01T12:00:00Z",
        byline: "By Alex Morgan",
        links: {
          web: { href: "https://example.com/wnba/game-1" },
        },
      },
    ],
  });

  const articles = await fetchLeagueNews("wnba");
  assert.equal(articles.length, 1);

  const article = articles[0];
  assert.equal(article.id, "12345");
  assert.equal(article.title, "Ace guards lead Game 1 charge");
  assert.equal(article.summary, "The defending champions set the tone early in the Finals.");
  assert.equal(article.league, "wnba");
  assert.equal(article.publishedAt, "2024-09-01T12:00:00.000Z");
  assert.equal(article.author, "Alex Morgan");
  assert.equal(article.url, "https://example.com/wnba/game-1");
});

test("fetchLeagueNews tolerates missing fields and falls back gracefully", async (t) => {
  t.afterEach(() => {
    restoreFetch();
    restoreDate();
  });

  withFixedDate("2024-09-02T00:00:00Z");

  mockFetchOnce({
    articles: [
      {
        headline: "Late equalizer shakes up standings",
        subtitle: "A stoppage-time stunner keeps the playoff race tight.",
        links: { mobile: { href: "https://example.com/nwsl/highlights" } },
      },
    ],
  });

  const articles = await fetchLeagueNews("nwsl");
  assert.equal(articles.length, 1);

  const article = articles[0];
  assert.ok(article.id.startsWith("nwsl-0-https://example.com/nwsl/highlights"));
  assert.equal(article.summary, "A stoppage-time stunner keeps the playoff race tight.");
  assert.equal(article.author, undefined);
  assert.equal(article.publishedAt, new ORIGINAL_DATE("2024-09-02T00:00:00Z").toISOString());
});

test("fetchLeagueNews filters out entries without a usable URL", async (t) => {
  t.afterEach(() => {
    restoreFetch();
    restoreDate();
  });

  mockFetchOnce({
    headlines: [
      {
        id: "no-url",
        headline: "Roster shuffle continues",
      },
      {
        guid: "with-url",
        headline: "Draft class impresses in preseason",
        lastModified: "2024-08-21T15:30:00Z",
        links: { web: { href: "https://example.com/pwhl/draft-class" } },
      },
    ],
  });

  const articles = await fetchLeagueNews("pwhl");
  assert.equal(articles.length, 1);
  assert.equal(articles[0]?.id, "with-url");
  assert.equal(articles[0]?.url, "https://example.com/pwhl/draft-class");
});
