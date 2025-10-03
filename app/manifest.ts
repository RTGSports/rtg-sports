import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Raising the Game Scores",
    short_name: "RTG Scores",
    description: "Live scores across the WNBA, NWSL, and PWHL in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0e19",
    theme_color: "#0b0e19",
    lang: "en",
    categories: ["sports", "news"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Today's games",
        url: "/",
        description: "Go straight to the live scores dashboard.",
      },
    ],
  };
}