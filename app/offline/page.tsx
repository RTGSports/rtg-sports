import type { Metadata } from "next";

export const dynamic = "error";

export function generateMetadata(): Metadata {
  return {
    title: "Offline | Raising the Game Scores",
  };
}

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-white">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">You&apos;re offline</h1>
        <p className="max-w-md text-base text-white/80">
          We couldn&apos;t reach the internet. Scores and news will refresh as soon
          as you&apos;re reconnected.
        </p>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium uppercase tracking-[0.35em] transition hover:border-white/30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Retry
      </button>
    </main>
  );
}
