"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Users, Ticket } from "lucide-react";

type Session = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  capacity: number;
  seats_left: number;
  creator_name: string;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sessions/")
      .then((r) => r.json())
      .then(setSessions)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  async function bookSession(id: number) {
    if (!user) {
      router.push("/login");
      return;
    }
    setBookingId(id);
    try {
      await api(`/sessions/${id}/book/`, { method: "POST" });
      setSessions((prev) =>
        prev
          ? prev.map((s) =>
              s.id === id ? { ...s, seats_left: s.seats_left - 1 } : s
            )
          : prev
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBookingId(null);
    }
  }

  if (error)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">{error}</div>
      </div>
    );

  if (!sessions)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-300" />
      </div>
    );

  if (sessions.length === 0)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl bg-indigo-50 p-5">
          <Calendar className="h-10 w-10 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-800">No sessions available</h2>
          <p className="mt-1 text-sm text-zinc-500">Check back later for new sessions.</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800">Book a Session</h1>
        <p className="mt-1 text-sm text-zinc-500">Browse and reserve your seat</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => {
          const isFull = s.seats_left === 0;
          const isBooking = bookingId === s.id;

          return (
            <div
              key={s.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-md"
            >
              <Link href={`/sessions/${s.id}`} className="flex-1 p-5">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-zinc-800 hover:text-indigo-600">
                    {s.title}
                  </h3>
                  <Badge
                    variant={isFull ? "destructive" : "secondary"}
                    className="ml-2 shrink-0"
                  >
                    {isFull ? "Full" : `${s.seats_left} left`}
                  </Badge>
                </div>
                <p className="mb-4 text-sm text-zinc-500">by {s.creator_name}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    {new Date(s.starts_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100">
                      <Users className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    {s.seats_left} of {s.capacity} seats available
                  </div>
                </div>
                {s.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-500">{s.description}</p>
                )}
              </Link>

              <div className="border-t border-zinc-100 bg-zinc-50/50 p-4">
                {isFull ? (
                  <Button variant="outline" className="w-full" disabled>
                    Fully Booked
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={isBooking}
                    onClick={() => bookSession(s.id)}
                  >
                    {isBooking ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Ticket className="mr-2 h-4 w-4" />
                        Book Now
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
