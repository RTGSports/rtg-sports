"use client";

import { FormEvent, useMemo, useState } from "react";
import { FavoriteItem, useFavorites } from "@/lib/hooks/use-favorites";

const DEFAULT_CATEGORIES: Array<{ label: string; value: FavoriteItem["category"] }> = [
  { label: "Team", value: "team" },
  { label: "League", value: "league" },
];

export function FavoritesBar() {
  const { favorites, loading, error, saving, addFavorite, removeFavorite } = useFavorites();
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<FavoriteItem["category"]>("team");
  const [formError, setFormError] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return saving || name.trim().length === 0;
  }, [saving, name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) {
      setFormError("Please enter a name to save to favorites.");
      return;
    }

    const id = `${category}-${trimmed.toLowerCase().replace(/\s+/g, "-")}`;

    const favorite: FavoriteItem = {
      id,
      label: trimmed,
      category,
    };

    const success = await addFavorite(favorite);
    if (success) {
      setName("");
      setFormError(null);
    }
  }

  const hasFavorites = favorites.length > 0;

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-surface/60 p-6 backdrop-blur">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-muted">Your Hub</p>
        <h2 className="text-xl font-semibold text-white">Favorites</h2>
        <p className="text-sm text-muted">
          Pin the teams and leagues you care about most to tailor the scoreboard.
        </p>
      </header>

      {(error || formError) && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {formError ?? error}
        </div>
      )}

      {loading && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              key={index}
              className="inline-flex h-9 w-24 animate-pulse items-center justify-center rounded-full border border-white/5 bg-white/10"
            />
          ))}
        </div>
      )}

      {!loading && !hasFavorites && !error && (
        <p className="rounded-2xl border border-white/5 bg-surface/80 px-4 py-3 text-sm text-muted">
          You haven&apos;t saved any favorites yet. Add a team or league to get started.
        </p>
      )}

      {hasFavorites && (
        <ul className="flex flex-wrap gap-2">
          {favorites.map((favorite) => (
            <li key={favorite.id}>
              <button
                type="button"
                onClick={() => removeFavorite(favorite.id)}
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-accent-200/60 hover:bg-accent-500/10"
                title="Remove favorite"
              >
                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-muted">
                  {favorite.category}
                </span>
                <span>{favorite.label}</span>
                <span className="text-muted transition group-hover:text-accent-200">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex-1 text-sm text-white">
            <span className="mb-1 block text-xs uppercase tracking-[0.35em] text-muted">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Seattle Storm"
              className="w-full rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
            />
          </label>
          <label className="text-sm text-white">
            <span className="mb-1 block text-xs uppercase tracking-[0.35em] text-muted">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as FavoriteItem["category"])}
              className="w-full rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
            >
              {DEFAULT_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full border border-accent-200/60 bg-accent-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitDisabled}
        >
          {saving ? "Saving..." : "Add to favorites"}
        </button>
      </form>
    </section>
  );
}
