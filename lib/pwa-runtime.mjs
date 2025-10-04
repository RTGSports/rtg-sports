const runtimeCaching = [
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/api/scoreboard"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "api-scoreboard",
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/api/news"),
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "api-news",
      expiration: {
        maxEntries: 30,
        maxAgeSeconds: 120,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request }) =>
      ["style", "script", "worker", "font", "image"].includes(request.destination),
    handler: "CacheFirst",
    options: {
      cacheName: "static-assets",
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request }) => request.mode === "navigate",
    handler: "NetworkFirst",
    options: {
      cacheName: "documents",
      networkTimeoutSeconds: 10,
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

export default runtimeCaching;
