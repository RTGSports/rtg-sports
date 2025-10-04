"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { NormalizedNewsArticle } from "@/lib/news";
import { getStoredValue, setStoredValue } from "@/lib/client-storage";

interface NewsResponse {
  articles: NormalizedNewsArticle[];
  refreshInterval: number;
}

const NEWS_STORAGE_KEY = "rtg-news";

function postServiceWorkerMessage(message: unknown) {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !navigator.serviceWorker?.controller
  ) {
    return;
  }

  try {
    navigator.serviceWorker.controller.postMessage(message);
  } catch {
    // Ignore postMessage failures in unsupported browsers.
  }
}

export function NewsPanel() {
  const initialNewsRef = useRef<NewsResponse | null | undefined>(undefined);
  const resolveInitialNews = () => {
    if (initialNewsRef.current === undefined) {
      initialNewsRef.current = getStoredValue<NewsResponse | null>(
        NEWS_STORAGE_KEY,
        null
      );
    }

    return initialNewsRef.current ?? null;
  };

  const [articles, setArticles] = useState<NormalizedNewsArticle[]>(() => {
    const cached = resolveInitialNews();
    return Array.isArray(cached?.articles) ? cached.articles : [];
  });
  const [loading, setLoading] = useState<boolean>(() => resolveInitialNews() === null);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(() =>
    resolveInitialNews()?.refreshInterval ?? null
  );
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const loadNews = useCallback(
    async (
      options: { background?: boolean; signal?: AbortSignal } = {}
    ) => {
      const { background = false, signal } = options;
      const cachedPayload = getStoredValue<NewsResponse | null>(
        NEWS_STORAGE_KEY,
        null
      );

      if (!background) {
        setError(null);
        setCacheNotice(null);
        setLoading(!cachedPayload);
      }

      try {
        const response = await fetch("/api/news", {
          cache: "default",
          signal,
        });

        if (!response.ok) {
          throw new Error(`News request failed: ${response.status}`);
        }

        const payload: NewsResponse = await response.json();

        setStoredValue(NEWS_STORAGE_KEY, payload);
        setArticles(Array.isArray(payload.articles) ? payload.articles : []);
        setRefreshInterval(payload.refreshInterval ?? null);
        setError(null);
        setCacheNotice(null);
        setIsUsingCache(false);

        postServiceWorkerMessage({
          type: "RTG_NEWS_UPDATE",
          payload,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const fallbackPayload =
          cachedPayload ??
          getStoredValue<NewsResponse | null>(NEWS_STORAGE_KEY, null);

        if (fallbackPayload) {
          setArticles(
            Array.isArray(fallbackPayload.articles)
              ? fallbackPayload.articles
              : []
          );
          setRefreshInterval((current) =>
            fallbackPayload.refreshInterval ?? current
          );
          setError(null);
          setCacheNotice("You’re offline. Showing saved headlines.");
          setIsUsingCache(true);
        } else {
          setError("Unable to load the latest headlines. Please try again soon.");
          setCacheNotice(null);
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const cached = getStoredValue<NewsResponse | null>(NEWS_STORAGE_KEY, null);

    if (cached) {
      setArticles(Array.isArray(cached.articles) ? cached.articles : []);
      setRefreshInterval(cached.refreshInterval ?? null);
      setLoading(false);
    } else {
      setArticles([]);
      setRefreshInterval(null);
      setLoading(true);
    }

    setError(null);
    setCacheNotice(null);
    setIsUsingCache(false);

    const controller = new AbortController();
    loadNews({ background: false, signal: controller.signal }).catch(() => {
      /* handled in loadNews */
    });

    return () => controller.abort();
  }, [loadNews]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      loadNews({ background: true }).catch(() => {
        /* handled in loadNews */
      });
    }, refreshInterval * 1000);

    return () => window.clearInterval(id);
  }, [loadNews, refreshInterval]);

  const groupedArticles = useMemo(() => {
    return articles.reduce<Record<string, NormalizedNewsArticle[]>>((acc, article) => {
      const key = article.league.toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(article);
      return acc;
    }, {});
  }, [articles]);

  useEffect(() => {
    if (!isSheetOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea",
      "input",
      "select",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const getFocusableElements = () => {
      return Array.from(dialog.querySelectorAll<HTMLElement>(focusSelectors)).filter(
        (element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden")
      );
    };

    const focusFirstElement = () => {
      const elements = getFocusableElements();
      (elements[0] ?? dialog).focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsSheetOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const elements = getFocusableElements();
      if (elements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (dialog.contains(event.target as Node)) {
        return;
      }

      focusFirstElement();
    };

    focusFirstElement();

    dialog.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    document.body.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.removeProperty("overflow");
      previouslyFocused?.focus?.();
    };
  }, [isSheetOpen]);

  const handleOpenSheet = () => {
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
  };

  const renderBody = () => {
    return (
      <>
        {cacheNotice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-100"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-200" aria-hidden />
            {cacheNotice}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-white/5 bg-surface/40 px-4 py-5"
              >
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="mt-3 h-4 w-3/4 rounded bg-white/10" />
                <div className="mt-2 h-4 w-2/3 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && !error && (
          <div className="rounded-2xl border border-white/5 bg-surface/60 px-6 py-10 text-center text-sm text-muted">
            No headlines to share just yet. Check back soon for fresh coverage.
          </div>
        )}

        {!loading && articles.length > 0 && <NewsPanelContent groupedArticles={groupedArticles} />}
      </>
    );
  };

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Latest Headlines</h2>
            {isUsingCache && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-200" aria-hidden />
                Offline
              </span>
            )}
          </div>
          <span className="text-xs uppercase tracking-[0.35em] text-muted">News Desk</span>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-white transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:hidden"
          onClick={handleOpenSheet}
        >
          View Headlines
        </button>
      </header>

      <div className="hidden space-y-4 lg:block">{renderBody()}</div>

      {isSheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6 pt-24 sm:pt-32"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseSheet();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-panel-dialog-title"
            className="w-full max-w-lg rounded-t-3xl bg-surface p-6 shadow-2xl outline-none"
            tabIndex={-1}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 id="news-panel-dialog-title" className="text-lg font-semibold">
                    Latest Headlines
                  </h2>
                  {isUsingCache && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.35em] text-amber-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-200" aria-hidden />
                      Offline
                    </span>
                  )}
                </div>
                <span className="text-xs uppercase tracking-[0.35em] text-muted">News Desk</span>
              </div>
              <button
                type="button"
                onClick={handleCloseSheet}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-white transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "min(70vh, 32rem)" }}>
              {renderBody()}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function NewsPanelContent({
  groupedArticles,
}: {
  groupedArticles: Record<string, NormalizedNewsArticle[]>;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(groupedArticles).map(([league, leagueArticles]) => (
        <div key={league} className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.35em] text-muted">{league}</h3>
          <ul className="space-y-3">
            {leagueArticles.map((article) => (
              <li key={article.id} className="rounded-2xl border border-white/5 bg-surface/80 p-5">
                <article className="space-y-2">
                  <div className="flex items-start justify-between gap-4 text-xs text-muted">
                    <span>{formatRelativeTime(article.publishedAt)}</span>
                    {article.author ? <span>{article.author}</span> : null}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-white transition hover:text-accent-200"
                  >
                    {article.title}
                  </a>
                  <p className="text-sm text-muted">{article.summary}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(timestamp: string) {
  try {
    const date = new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / (1000 * 60));

    if (Number.isNaN(minutes)) {
      throw new Error("Invalid date");
    }

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    }

    const days = Math.round(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } catch {
    return "Recently";
  }
}
