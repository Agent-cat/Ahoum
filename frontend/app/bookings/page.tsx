"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Clock, Ticket, XCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

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
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ id: number; title: string } | null>(null);

  function load() {
    if (!user) return;
    api("/bookings/")
      .then(setBookings)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    load();
  }, [ready, user]);

  async function cancelBooking(sessionId: number) {
    setShowConfirm(null);
    setCancellingId(sessionId);
    try {
      await api(`/sessions/${sessionId}/unregister/`, { method: "POST" });
      toast.success("Unregistered", { description: "You've been removed from this session." });
      load();
    } catch (e: any) {
      toast.error("Failed to cancel", { description: e.message });
    } finally {
      setCancellingId(null);
    }
  }

  if (!ready)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-300" />
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl bg-indigo-50 p-5">
          <Ticket className="h-10 w-10 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-800">Sign in required</h2>
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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800">My Bookings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your upcoming and past sessions</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!bookings && !error && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner className="h-8 w-8 text-zinc-300" />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-800">
          <Calendar className="h-5 w-5 text-indigo-500" />
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            No upcoming bookings.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <Link href={`/sessions/${b.session}`} className="flex-1 p-5">
                  <h3 className="text-lg font-semibold text-zinc-800 hover:text-indigo-600">{b.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(b.starts_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </Link>
                <div className="border-t border-zinc-100 bg-zinc-50/50 p-4">
                  {cancellingId === b.session ? (
                    <Button variant="outline" className="w-full" disabled>
                      <Spinner className="mr-2 h-4 w-4" />
                      Cancelling...
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setShowConfirm({ id: b.session, title: b.title })}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Booking
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-800">
          <Clock className="h-5 w-5 text-zinc-400" />
          Past
        </h2>
        {past.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Nothing here yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((b) => (
              <Link key={b.id} href={`/sessions/${b.session}`} className="group block">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <h3 className="font-semibold text-zinc-800 group-hover:text-indigo-600">{b.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(b.starts_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-800">Cancel Booking</h3>
              <button onClick={() => setShowConfirm(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-zinc-600">
              Are you sure you want to cancel <strong>{showConfirm.title}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(null)}>
                Keep Booking
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => cancelBooking(showConfirm.id)}
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
