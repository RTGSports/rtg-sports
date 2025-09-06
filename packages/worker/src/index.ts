const VERSION = "rtg-hard-reset-" + new Date().toISOString();

export interface Env { RATE_LIMIT: KVNamespace; APP_NAME?: string; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/__version") {
      return new Response(JSON.stringify({ version: VERSION, path: url.pathname }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/scores/mock") {
      const data = {
        version: VERSION,
        date: new Date().toISOString().slice(0,10),
        leagues: {
          wnba: [{ home: "Aces", away: "Liberty", status: "Final", score: "78-73" }],
          nwsl: [{ home: "Thorns", away: "Wave", status: "Today 7:00 PM", score: null }]
        }
      };
      return Response.json(data);
    }

    if (url.pathname === "/hello") {
      return Response.json({ message: `Hello from ${env.APP_NAME || "RTG Sports"}`, version: VERSION });
    }

    return new Response(JSON.stringify({ message: "Not Found", path: url.pathname, version: VERSION }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
} satisfies ExportedHandler<Env>;