"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Game = { home: string; away: string; status: string; score: string | null };
type Data = { date: string; leagues: { wnba: Game[]; nwsl: Game[] } };

export default function Home() {
  const [msg, setMsg] = useState("loading...");
  const [data, setData] = useState<Data | null>(null);
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState("");

  useEffect(() => {
    fetch("/api/hello").then(r => r.json()).then(d => setMsg(d.message)).catch(() => setMsg("offline"));
    fetch("/api/scores/mock").then(r => r.json()).then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setAuthNote("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setAuthNote(error ? error.message : "Check your email for a magic link.");
  }

  async function signOut() { await supabase.auth.signOut(); }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">RTG Sports</h1>
      <p className="mt-2 text-sm text-gray-600">WNBA & NWSL — PWA v0</p>

      <div className="mt-6 rounded-lg border bg-white p-4 shadow">
        <p>Worker says: <span className="font-mono">{msg}</span></p>
      </div>

      <section className="mt-8 rounded-lg border bg-white p-4 shadow">
        <h2 className="text-lg font-semibold mb-3">Sign in</h2>
        {userEmail ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">Signed in as <span className="font-medium">{userEmail}</span></p>
            <button onClick={signOut} className="rounded bg-gray-900 px-3 py-2 text-white text-sm">Sign out</button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="flex gap-2">
            <input
              type="email" required placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="flex-1 rounded border px-3 py-2 text-sm"
            />
            <button className="rounded bg-gray-900 px-3 py-2 text-white text-sm">Send magic link</button>
          </form>
        )}
        {!!authNote && <p className="mt-2 text-xs text-gray-600">{authNote}</p>}
      </section>
    </main>
  );
}