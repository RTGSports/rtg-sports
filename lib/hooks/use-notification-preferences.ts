"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredValue, setStoredValue } from "@/lib/client-storage";

export interface NotificationPreferences {
  gameStart: boolean;
  finalScore: boolean;
  breakingNews: boolean;
  email: string | null;
}

const STORAGE_KEY = "rtg:notification-preferences";

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  loading: boolean;
  error: string | null;
  saving: boolean;
  updatePreferences: (update: NotificationPreferences) => Promise<boolean>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  gameStart: true,
  finalScore: true,
  breakingNews: false,
  email: null,
};

export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    getStoredValue(STORAGE_KEY, DEFAULT_PREFERENCES)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Notification request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const nextPreferences: NotificationPreferences = {
          ...DEFAULT_PREFERENCES,
          ...(payload?.preferences ?? {}),
        };

        if (mounted) {
          setPreferences(nextPreferences);
          setStoredValue(STORAGE_KEY, nextPreferences);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError("We couldn't load your notification settings just yet.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPreferences().catch(() => {
      // handled in loadPreferences
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setStoredValue(STORAGE_KEY, preferences);
  }, [preferences]);

  const updatePreferences = useCallback(async (update: NotificationPreferences) => {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        throw new Error(`Unable to update preferences: ${response.status}`);
      }

      const payload = await response.json();
      const nextPreferences: NotificationPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(payload?.preferences ?? {}),
      };

      setPreferences(nextPreferences);
      setError(null);
      return true;
    } catch (error) {
      console.error(error);
      setError("We couldn't update your notifications right now.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return useMemo(
    () => ({ preferences, loading, error, saving, updatePreferences }),
    [preferences, loading, error, saving, updatePreferences]
  );
}
