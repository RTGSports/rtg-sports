"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  NotificationPreferences,
  useNotificationPreferences,
} from "@/lib/hooks/use-notification-preferences";

export function NotificationPreferencesPanel() {
  const { preferences, loading, error, saving, updatePreferences } =
    useNotificationPreferences();
  const [formState, setFormState] = useState<NotificationPreferences>(preferences);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormState(preferences);
  }, [preferences]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (formState.email && !isValidEmail(formState.email)) {
      setFormError("Please provide a valid email address.");
      return;
    }

    const success = await updatePreferences(formState);

    if (success) {
      setFormSuccess("Preferences saved.");
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-surface/60 p-6 backdrop-blur">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.35em] text-muted">Stay Informed</p>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="text-sm text-muted">
          Choose how we keep you updated on game action and breaking news.
        </p>
      </header>

      {(error || formError || formSuccess) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            formError
              ? "border-red-400/30 bg-red-500/10 text-red-100"
              : formSuccess
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-400/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {formError ?? formSuccess ?? error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-5 w-5 rounded border border-white/10 bg-white/10" />
              <span className="h-4 w-40 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-[0.35em] text-muted">
              Alerts
            </legend>
            <ToggleRow
              id="game-start"
              label="Game start"
              description="Ping me when my teams are about to tip off, kick off, or drop the puck."
              checked={formState.gameStart}
              onChange={(checked) =>
                setFormState((current) => ({ ...current, gameStart: checked }))
              }
            />
            <ToggleRow
              id="final-score"
              label="Final score"
              description="Send the final score and top performers when the action wraps."
              checked={formState.finalScore}
              onChange={(checked) =>
                setFormState((current) => ({ ...current, finalScore: checked }))
              }
            />
            <ToggleRow
              id="breaking-news"
              label="Breaking news"
              description="Get notified when major trades, injuries, or signings hit the wire."
              checked={formState.breakingNews}
              onChange={(checked) =>
                setFormState((current) => ({ ...current, breakingNews: checked }))
              }
            />
          </fieldset>

          <div className="space-y-2">
            <label className="block text-sm text-white">
              <span className="mb-1 block text-xs uppercase tracking-[0.35em] text-muted">
                Email address (optional)
              </span>
              <input
                type="email"
                value={formState.email ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value || null }))
                }
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/5 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500/40"
              />
            </label>
            <p className="text-xs text-muted">
              We&apos;ll use your email to send only the updates you opt into.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-accent-200/60 bg-accent-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </form>
      )}
    </section>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-black/40 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border border-white/10 bg-white/10 text-accent-200 focus:ring-accent-200"
      />
    </label>
  );
}

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}
