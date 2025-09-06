"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("loading...");

  useEffect(() => {
    fetch("/api/hello")
      .then(r => r.json())
      .then(d => setMsg(d.message))
      .catch(() => setMsg("offline"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold">RTG Sports</h1>
      <p className="mt-2 text-sm text-gray-600">WNBA & NWSL — PWA v0</p>

      <div className="mt-6 rounded-lg border bg-white p-4 shadow">
        <p>
          Worker says: <span className="font-mono">{msg}</span>
        </p>
      </div>
    </main>
  );
}