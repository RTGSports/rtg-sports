"use client";

import { DEFAULT_LEAGUE } from "@/lib/leagues";
import { FavoritesBar } from "@/components/favorites-bar";
import { NewsPanel } from "@/components/news-panel";
import { ScoreboardView } from "@/components/scoreboard-view";
import { NotificationPreferencesPanel } from "@/components/notification-preferences";

export function ScoreboardSection() {
  return <ScoreboardView initialLeague={DEFAULT_LEAGUE} />;
}

export function FavoritesSection() {
  return <FavoritesBar />;
}

export function NotificationsSection() {
  return <NotificationPreferencesPanel />;
}

export function NewsSection() {
  return <NewsPanel />;
}
