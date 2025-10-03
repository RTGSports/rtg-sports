export const metadata = {
  title: "Offline | Raising the Game Scores",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-white">
      <h1 className="text-3xl font-bold">You&apos;re offline</h1>
      <p className="max-w-md text-base text-white/80">
        We couldn&apos;t reach the internet. Scores and news will update once you&apos;re
        back online.
      </p>
    </main>
  );
}
