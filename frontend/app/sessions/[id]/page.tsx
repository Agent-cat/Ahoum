"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Users, ArrowLeft, CheckCircle2, AlertCircle, XCircle, Ticket, X } from "lucide-react";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function load() {
    try {
      setSession(await api(`/sessions/${id}/`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function book() {
    setBusy(true);
    setShowConfirm(false);
    try {
      await api(`/sessions/${id}/book/`, { method: "POST" });
      toast.success("Booked!", { description: "You've been registered for this session." });
      await load();
    } catch (e: any) {
      toast.error("Booking failed", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (error && !session)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">{error}</div>
        <Link href="/sessions">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sessions
          </Button>
        </Link>
      </div>
    );

  if (!session)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-300" />
      </div>
    );

  const started = new Date(session.starts_at).getTime() <= Date.now();
  const isCreatorOfThis = user?.role === "creator" && user.username === session.creator_name;
  const isFull = session.seats_left === 0;

  const getBookingStatus = () => {
    if (!user) return { icon: <XCircle className="h-4 w-4" />, text: "Sign in to book", variant: "outline" as const };
    if (started) return { icon: <XCircle className="h-4 w-4" />, text: "Session started", variant: "secondary" as const };
    if (isCreatorOfThis) return { icon: <CheckCircle2 className="h-4 w-4" />, text: "You're hosting", variant: "secondary" as const };
    if (isFull) return { icon: <XCircle className="h-4 w-4" />, text: "Fully booked", variant: "destructive" as const };
    return { icon: <CheckCircle2 className="h-4 w-4" />, text: "Available", variant: "default" as const };
  };

  const bookingStatus = getBookingStatus();

  const canBook = user && !started && !isCreatorOfThis && !isFull;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/sessions" className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to sessions
      </Link>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-800">{session.title}</h1>
              <p className="mt-1 text-sm text-zinc-500">Hosted by {session.creator_name}</p>
            </div>
            <Badge variant={bookingStatus.variant}>
              {bookingStatus.icon}
              {bookingStatus.icon && <span className="ml-1">{bookingStatus.text}</span>}
              {!bookingStatus.icon && bookingStatus.text}
            </Badge>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  {new Date(session.starts_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(session.starts_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  {session.capacity} total seats
                </p>
                <p className="text-xs text-zinc-500">
                  {isFull
                    ? "Fully booked"
                    : `${session.seats_left} seat${session.seats_left !== 1 ? "s" : ""} remaining`}
                </p>
              </div>
            </div>
          </div>

          {session.description && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-zinc-800">About this session</h3>
              <p className="text-sm leading-relaxed text-zinc-600">{session.description}</p>
            </div>
          )}

          {canBook && (
            <Button onClick={() => setShowConfirm(true)} disabled={busy} className="w-full" size="lg">
              <Ticket className="mr-2 h-4 w-4" />
              Book Now
            </Button>
          )}

          {!user && (
            <Link href="/login" className="block">
              <Button className="w-full" size="lg">
                Sign in to book
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-800">Confirm Booking</h3>
              <button onClick={() => setShowConfirm(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-zinc-600">
              Are you sure you want to book <strong>{session.title}</strong>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={book} disabled={busy}>
                {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
