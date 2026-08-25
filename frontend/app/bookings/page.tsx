"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Clock, ArrowRight, Ticket } from "lucide-react";

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

  if (!ready)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Ticket className="h-12 w-12 text-zinc-300" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sign in required</h2>
          <p className="mt-1 text-sm text-zinc-500">Sign in to view your bookings.</p>
        </div>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );

  const upcoming = (bookings ?? []).filter((b) => !b.is_past);
  const past = (bookings ?? []).filter((b) => b.is_past);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">My bookings</h1>
        <p className="text-sm text-zinc-500">Manage your upcoming and past sessions</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!bookings && !error && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner className="h-8 w-8 text-zinc-400" />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Calendar className="h-5 w-5" />
          Upcoming
        </h2>
        <BookingList items={upcoming} empty="No upcoming bookings." />
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Clock className="h-5 w-5" />
          Past
        </h2>
        <BookingList items={past} empty="Nothing here yet." />
      </div>
    </div>
  );
}

function BookingList({ items, empty }: { items: Booking[]; empty: string }) {
  if (items.length === 0)
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        {empty}
      </div>
    );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((b) => (
        <Link key={b.id} href={`/sessions/${b.session}`} className="group block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="group-hover:text-zinc-700">{b.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Calendar className="h-4 w-4" />
                  {new Date(b.starts_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
