import { DEFAULT_LEAGUE } from "@/lib/leagues";
import { FavoritesBar } from "@/components/favorites-bar";
import { NewsPanel } from "@/components/news-panel";
import { ScoreboardView } from "@/components/scoreboard-view";
import { NotificationPreferencesPanel } from "@/components/notification-preferences";

export default function HomePage() {
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
          <div className="grid gap-10 lg:grid-cols-[1.75fr_1fr]">
            <section className="space-y-8">
              <ScoreboardView initialLeague={DEFAULT_LEAGUE} />
              <FavoritesBar />
              <NotificationPreferencesPanel />
            </section>
            <aside>
              <NewsPanel />
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
