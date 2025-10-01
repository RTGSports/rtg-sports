"use client";

import { useEffect, useMemo, useState } from "react";

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  league: string;
  publishedAt: string;
  author: string;
  url: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  refreshInterval: number;
}

export function NewsPanel() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadNews(options: { background?: boolean } = {}) {
      const { background = false } = options;

      if (!background) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/news", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`News request failed: ${response.status}`);
        }

        const payload: NewsResponse = await response.json();

        if (!mounted) {
          return;
        }

        setArticles(Array.isArray(payload.articles) ? payload.articles : []);
        setRefreshInterval(payload.refreshInterval ?? null);
        setError(null);
      } catch (err) {
        if (!mounted || (err as Error).name === "AbortError") {
          return;
        }

        setError("Unable to load the latest headlines. Please try again soon.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadNews().catch(() => {
      // handled in loadNews
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      loadLatest().catch(() => {
        // handled in loadLatest
      });
    }, refreshInterval * 1000);

    async function loadLatest() {
      try {
        const response = await fetch("/api/news", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`News refresh failed: ${response.status}`);
        }

        const payload: NewsResponse = await response.json();
        setArticles(Array.isArray(payload.articles) ? payload.articles : []);
        setRefreshInterval(payload.refreshInterval ?? refreshInterval);
      } catch (error) {
        console.error(error);
      }
    }

    return () => window.clearInterval(id);
  }, [refreshInterval]);

  const groupedArticles = useMemo(() => {
    return articles.reduce<Record<string, NewsArticle[]>>((acc, article) => {
      const key = article.league.toUpperCase();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(article);
      return acc;
    }, {});
  }, [articles]);

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Latest Headlines</h2>
        <span className="text-xs uppercase tracking-[0.35em] text-muted">News Desk</span>
      </header>

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

      {!loading && articles.length > 0 && (
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
                        <span>{article.author}</span>
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
      )}
    </section>
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
