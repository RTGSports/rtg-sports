"use client";

import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  FavoritesSection,
  NewsSection,
  NotificationsSection,
  ScoreboardSection,
} from "@/components/home-sections";

type HomeTabConfig = {
  id: string;
  label: string;
  Component: () => JSX.Element;
};

const HOME_TABS: readonly HomeTabConfig[] = [
  { id: "scoreboard", label: "Scoreboard", Component: ScoreboardSection },
  { id: "favorites", label: "Favorites", Component: FavoritesSection },
  { id: "notifications", label: "Notifications", Component: NotificationsSection },
  { id: "news", label: "News", Component: NewsSection },
];

type HomeTab = (typeof HOME_TABS)[number]["id"];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTab>(HOME_TABS[0].id);

  const focusTabByIndex = useCallback((index: number) => {
    const tabId = HOME_TABS[index]?.id;
    if (!tabId) return;

    const element = document.getElementById(`${tabId}-tab`);
    element?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % HOME_TABS.length;
        setActiveTab(HOME_TABS[nextIndex].id);
        focusTabByIndex(nextIndex);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex = (currentIndex - 1 + HOME_TABS.length) % HOME_TABS.length;
        setActiveTab(HOME_TABS[prevIndex].id);
        focusTabByIndex(prevIndex);
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveTab(HOME_TABS[0].id);
        focusTabByIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        const lastIndex = HOME_TABS.length - 1;
        setActiveTab(HOME_TABS[lastIndex].id);
        focusTabByIndex(lastIndex);
      }
    },
    [focusTabByIndex],
  );

  return (
    <main className="bg-gradient-to-b from-background via-background to-black">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <p className="text-sm uppercase tracking-[0.35em] text-accent-200">
            Raising the Game
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Women&apos;s Sports Scoreboard
          </h1>
          <p className="max-w-2xl text-base text-muted sm:text-lg">
            Real-time scores for the WNBA, NWSL, and PWHL. Select a league to check in
            on the action, and we&apos;ll refresh the games automatically.
          </p>
        </header>

        <div className="flex-1 space-y-10">
          <div className="lg:hidden">
            <div
              role="tablist"
              aria-label="Scoreboard sections"
              aria-orientation="horizontal"
              className="flex flex-wrap gap-2"
            >
              {HOME_TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  id={`${tab.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                    activeTab === tab.id
                      ? "border-accent-100 bg-accent-500 text-black"
                      : "border-white/10 bg-surface/40 text-muted hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {HOME_TABS.map((tab) => {
              const PanelComponent = tab.Component;
              return (
                <div
                  key={tab.id}
                  role="tabpanel"
                  id={`${tab.id}-panel`}
                  aria-labelledby={`${tab.id}-tab`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  hidden={activeTab !== tab.id}
                  className="mt-6 space-y-8"
                >
                  <PanelComponent />
                </div>
              );
            })}
          </div>

          <div className="hidden gap-10 lg:grid lg:grid-cols-[1.75fr_1fr]">
            <section className="space-y-8">
              <ScoreboardSection />
              <FavoritesSection />
              <NotificationsSection />
            </section>
            <aside>
              <NewsSection />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
