"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredValue, setStoredValue } from "@/lib/client-storage";

export interface FavoriteItem {
  id: string;
  label: string;
  category: "team" | "league";
}

const STORAGE_KEY = "rtg:favorites";

interface UseFavoritesResult {
  favorites: FavoriteItem[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  addFavorite: (favorite: FavoriteItem) => Promise<boolean>;
  removeFavorite: (id: string) => Promise<boolean>;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() =>
    getStoredValue(STORAGE_KEY, [])
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Favorites request failed with status ${response.status}`);
        }

        const payload = await response.json();

        if (!mounted) {
          return;
        }

        const items = Array.isArray(payload.favorites) ? payload.favorites : [];
        setFavorites(items);
        setStoredValue(STORAGE_KEY, items);
        setError(null);
      } catch {
        if (mounted) {
          setError("We couldn't load your favorites just yet.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadFavorites().catch(() => {
      // handled in loadFavorites
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setStoredValue(STORAGE_KEY, favorites);
  }, [favorites]);

  const addFavorite = useCallback(async (favorite: FavoriteItem) => {
    setSaving(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favorite),
      });

      if (!response.ok) {
        throw new Error(`Unable to add favorite: ${response.status}`);
      }

      const payload = await response.json();
      const items = Array.isArray(payload.favorites) ? payload.favorites : [];
      setFavorites(items);
      setError(null);
      return true;
    } catch (error) {
      console.error(error);
      setError("We couldn't save that favorite. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const removeFavorite = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error(`Unable to remove favorite: ${response.status}`);
      }

      const payload = await response.json();
      const items = Array.isArray(payload.favorites) ? payload.favorites : [];
      setFavorites(items);
      setError(null);
      return true;
    } catch (error) {
      console.error(error);
      setError("We couldn't remove that favorite right now.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(
    () => ({ favorites, loading, error, saving, addFavorite, removeFavorite }),
    [favorites, loading, error, saving, addFavorite, removeFavorite]
  );
}
