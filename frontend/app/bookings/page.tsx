"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";

type Booking = {
  id: number;
  session: number;
  title: string;
  starts_at: string;
  is_past: boolean;
};

export default function BookingsPage() {
  const { user, ready } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    api("/bookings/")
      .then(setBookings)
      .catch((e) => setError(e.message));
  }, [ready, user]);

  if (!ready) return null;
  if (!user)
    return (
      <p>
        <Link href="/login">Sign in</Link> to see your bookings.
      </p>
    );

  const upcoming = (bookings ?? []).filter((b) => !b.is_past);
  const past = (bookings ?? []).filter((b) => b.is_past);

  return (
    <div>
      <h1>My bookings</h1>
      {error && <p className="error">{error}</p>}
      {!bookings && !error && <p>Loading…</p>}

      <h2>Upcoming</h2>
      <BookingList items={upcoming} empty="No upcoming bookings." />

      <h2>Past</h2>
      <BookingList items={past} empty="Nothing here yet." />
    </div>
  );
}

function BookingList({ items, empty }: { items: Booking[]; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="cards">
      {items.map((b) => (
        <li key={b.id} className="card">
          <Link href={`/sessions/${b.session}`}>
            <strong>{b.title}</strong>
          </Link>
          <p>{new Date(b.starts_at).toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
