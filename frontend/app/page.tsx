"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";

type Session = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  capacity: number;
  seats_left: number;
  creator_name: string;
};

export default function CatalogPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState("");
  const { ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    fetch("/api/sessions/")
      .then((r) => r.json())
      .then(setSessions)
      .catch((e) => setError(String(e.message || e)));
  }, [ready]);

  if (error) return <p className="error">{error}</p>;
  if (!sessions) return <p>Loading…</p>;
  if (sessions.length === 0)
    return (
      <p>
        No sessions yet.{" "}
        <Link href="/creator">
          Create the first one
        </Link>{" "}
        (creators only).
      </p>
    );

  return (
    <>
      <h1>Upcoming sessions</h1>
      <ul className="cards">
        {sessions.map((s) => (
          <li key={s.id} className="card">
            <Link href={`/sessions/${s.id}`}>
              <h2>{s.title}</h2>
            </Link>
            <p className="muted">by {s.creator_name}</p>
            <p>{new Date(s.starts_at).toLocaleString()}</p>
            <p>
              {s.seats_left} of {s.capacity} seats left
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
