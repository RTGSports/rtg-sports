import { NextResponse } from "next/server";

const MOCK_NEWS = [
  {
    id: "wnba-2024-finals-preview",
    title: "Five storylines to watch heading into the WNBA Finals",
    summary:
      "A closer look at the key matchups, player rivalries, and tactical wrinkles that will define this year's championship series.",
    league: "wnba",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    author: "Alex Morgan",
    url: "https://example.com/wnba-finals-preview",
  },
  {
    id: "nwsl-rivalry-week",
    title: "NWSL Rivalry Week delivers drama from coast to coast",
    summary:
      "Late winners, stunning saves, and playoff implications — we break down the biggest moments from the weekend slate.",
    league: "nwsl",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    author: "Jordan Martinez",
    url: "https://example.com/nwsl-rivalry-week",
  },
  {
    id: "pwhl-draft-class-spotlight",
    title: "Meet the rising stars from this season's PWHL draft class",
    summary:
      "From blistering slapshots to poised two-way centers, the next wave of PWHL talent is already making an impact.",
    league: "pwhl",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    author: "Taylor Chen",
    url: "https://example.com/pwhl-draft-class",
  },
];

export async function GET() {
  return NextResponse.json({
    articles: MOCK_NEWS,
    refreshInterval: 300,
  });
}
