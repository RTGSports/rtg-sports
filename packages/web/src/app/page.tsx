"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { addFavorite, listFavorites, removeFavorite, type Favorite } from "../lib/favorites";
import { listTeams, type Team } from "../lib/teams";

type Game = { home: string; away: string; status: string; score: string | null };
type Data = { date: string; leagues: { wnba: Game[]; nwsl: Game[] } };

export default function Home() {
  const [msg, setMsg] = useState("loading...");
  const [data, setData] = useState<Data | null>(null);

  // auth state
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState("");

  // favorites
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [favNote, setFavNote] = useState("");

  // dynamic team lists from Supabase
  const [wnbaTeams, setWnbaTeams] = useState<Team[]>([]);
  const [nwslTeams, setNwslTeams] = useState<Team[]>([]);
  const [teamsNote, setTeamsNote] = useState("");

  // worker calls
  useEffect(() => {
    fetch("/api/hello").then(r => r.json()).then(d => setMsg(d.message)).catch(() => setMsg("offline"));
    fetch("/api/scores/mock").then(r => r.json()).then(setData).catch(() => setData(null));
  }, []);

  // auth + favorites
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) refreshFavs();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email ?? null);
      if (session?.user) refreshFavs();
      else setFavs([]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // load teams once
  useEffect(() => {
    (async () => {
      try {
        const [w, n] = await Promise.all([listTeams("wnba"), listTeams("nwsl")]);
        setWnbaTeams(w);
        setNwslTeams(n);
      } catch (e: any) {
        setTeamsNote(e.message ?? "Failed to load teams");
      }
    })();
  }, []);

  async function refreshFavs() {
    try {
      setFavs(await listFavorites());
    } catch (e: any) {
      setFavNote(e.message ?? "Failed to load favorites");
    }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthNote("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });
    setAuthNote(error ? error.message : "Check your email for a 6-digit code.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthNote("");
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setAuthNote(error ? error.message : data.session ? "Signed in!" : "Verified.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // NOTE: we pass team.code as the favorites.team_id for now
  async function onAdd(league: "wnba" | "nwsl", teamCode: string) {
    setFavNote("");
    try {
      await addFavorite(league, teamCode); // uses existing favorites(team_id text)
      await refreshFavs();
    } catch (e: any) {
      setFavNote(e.message ?? "Failed to add favorite");
    }
  }

  async function onRemove(id: number) {
    setFavNote("");
    try {
      await removeFavorite(id);
      await refreshFavs();
    } catch (e: any) {
      setFavNote(e.message ?? "Failed to remove favorite");
    }
  }

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
          <div className="space-y-3">
            <form onSubmit={sendOtp} className="flex gap-2">
              <input
                type="email" required placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button className="rounded bg-gray-900 px-3 py-2 text-white text-sm">Send code</button>
            </form>
            <form onSubmit={verifyOtp} className="flex gap-2">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" placeholder="6-digit code"
                value={code} onChange={e => setCode(e.target.value)}
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <button className="rounded bg-gray-900 px-3 py-2 text-white text-sm">Verify</button>
            </form>
          </div>
        )}
        {!!authNote && <p className="mt-2 text-xs text-gray-600">{authNote}</p>}
      </section>

      {userEmail && (
        <section className="mt-8 rounded-lg border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-3">Favorites</h2>

          <p className="text-xs text-gray-600 mb-2">Pick a team to follow:</p>
          {teamsNote && <p className="mb-2 text-xs text-red-600">{teamsNote}</p>}

          <div className="grid grid-cols-2 gap-2">
            {wnbaTeams.map(t => (
              <button key={`w-${t.code}`} onClick={() => onAdd("wnba", t.code)} className="rounded border px-2 py-2 text-sm">
                ⭐ WNBA: {t.display_name}
              </button>
            ))}
            {nwslTeams.map(t => (
              <button key={`n-${t.code}`} onClick={() => onAdd("nwsl", t.code)} className="rounded border px-2 py-2 text-sm">
                ⭐ NWSL: {t.display_name}
              </button>
            ))}
          </div>

          <h3 className="mt-4 font-medium text-gray-700">Your favorites</h3>
          <ul className="mt-2 divide-y rounded-lg border bg-white">
            {favs.length === 0 && <li className="p-3 text-sm text-gray-600">None yet.</li>}
            {favs.map(f => (
              <li key={f.id} className="p-3 flex items-center justify-between">
                <span className="text-sm">{f.league.toUpperCase()} — {/** team_id for current schema */ (f as any).team_id}</span>
                <button onClick={() => onRemove(f.id)} className="text-xs text-red-600 hover:underline">remove</button>
              </li>
            ))}
          </ul>
          {!!favNote && <p className="mt-2 text-xs text-red-600">{favNote}</p>}
        </section>
      )}

      <section className="mt-8 space-y-6">
        <h2 className="text-xl font-semibold">Today</h2>
        {data ? (
          <>
            <div>
              <h3 className="mb-2 font-medium text-gray-700">WNBA</h3>
              <ul className="divide-y rounded-lg border bg-white">
                {data.leagues.wnba.map((g, i) => (
                  <li key={`w-${i}`} className="p-3 flex items-center justify-between">
                    <span>{g.away} @ {g.home}</span>
                    <span className="text-sm text-gray-600">{g.score ?? g.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-gray-700">NWSL</h3>
              <ul className="divide-y rounded-lg border bg-white">
                {data.leagues.nwsl.map((g, i) => (
                  <li key={`n-${i}`} className="p-3 flex items-center justify-between">
                    <span>{g.away} @ {g.home}</span>
                    <span className="text-sm text-gray-600">{g.score ?? g.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">No games to show.</p>
        )}
      </section>
    </main>
  );
}