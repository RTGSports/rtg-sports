import test from "node:test";
import assert from "node:assert/strict";

import { GET } from "@/app/api/scoreboard/route";

const ORIGINAL_FETCH = global.fetch;

test("scoreboard route returns empty results for ESPN 404", async () => {
  global.fetch = async () =>
    new Response(null, { status: 404, statusText: "Not Found" });

  try {
    const request = { url: "http://localhost/api/scoreboard?league=wnba" } as any;
    const response = await GET(request);

    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(Array.isArray(payload.games), true);
    assert.equal(payload.games.length, 0);
  } finally {
    global.fetch = ORIGINAL_FETCH;
  }
});
