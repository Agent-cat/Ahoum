"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, currentUser } from "@/src/lib/api";
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

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, ready } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setSession(await api(`/sessions/${id}/`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ready]);

  async function book() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/sessions/${id}/book/`, { method: "POST" });
      setMessage("Booked! See My bookings.");
      await load();
    } catch (e: any) {
      setError(e.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error && !session)
    return (
      <div className="error">
        <p>{error}</p>
        <Link href="/">Back to catalog</Link>
      </div>
    );
  if (!session) return <p>Loading…</p>;

  const started = new Date(session.starts_at).getTime() <= Date.now();
  const isCreatorOfThis = user?.role === "creator" && user.username === session.creator_name;

  return (
    <article>
      <h1>{session.title}</h1>
      <p className="muted">Hosted by {session.creator_name}</p>
      <p>{new Date(session.starts_at).toLocaleString()}</p>
      <p>
        {session.seats_left} of {session.capacity} seats left
      </p>
      <p>{session.description}</p>

      {message && <p className="ok">{message}</p>}
      {error && <p className="error">{error}</p>}

      {!user ? (
        <p>
          <Link href="/login">Sign in</Link> to book this session.
        </p>
      ) : started ? (
        <p className="muted">This session has already started — booking is closed.</p>
      ) : isCreatorOfThis ? (
        <p className="muted">You are hosting this session.</p>
      ) : session.seats_left === 0 ? (
        <p className="muted">Fully booked.</p>
      ) : (
        <button onClick={book} disabled={busy} className="btn">
          {busy ? "Booking…" : "Book a seat"}
        </button>
      )}
    </article>
  );
}
