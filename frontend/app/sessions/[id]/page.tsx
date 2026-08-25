"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, currentUser } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Users, ArrowLeft, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to catalog
          </Button>
        </Link>
      </div>
    );

  if (!session)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );

  const started = new Date(session.starts_at).getTime() <= Date.now();
  const isCreatorOfThis = user?.role === "creator" && user.username === session.creator_name;

  const getBookingStatus = () => {
    if (!user) return { icon: <XCircle className="h-4 w-4" />, text: "Sign in to book", variant: "outline" as const };
    if (started) return { icon: <XCircle className="h-4 w-4" />, text: "Session started", variant: "secondary" as const };
    if (isCreatorOfThis) return { icon: <CheckCircle2 className="h-4 w-4" />, text: "You're hosting", variant: "secondary" as const };
    if (session.seats_left === 0) return { icon: <XCircle className="h-4 w-4" />, text: "Fully booked", variant: "destructive" as const };
    return { icon: null, text: "Available", variant: "default" as const };
  };

  const bookingStatus = getBookingStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to catalog
      </Link>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <CardDescription className="mt-1">Hosted by {session.creator_name}</CardDescription>
            </div>
            <Badge variant={bookingStatus.variant}>
              {bookingStatus.icon}
              {bookingStatus.icon && <span className="ml-1">{bookingStatus.text}</span>}
              {!bookingStatus.icon && bookingStatus.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
              <Calendar className="h-5 w-5 text-zinc-600" />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {new Date(session.starts_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-zinc-600">
                  {new Date(session.starts_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 p-4">
              <Users className="h-5 w-5 text-zinc-600" />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {session.seats_left} of {session.capacity} seats
                </p>
                <p className="text-xs text-zinc-600">
                  {session.seats_left === 0 ? "No seats available" : `${session.seats_left} seats remaining`}
                </p>
              </div>
            </div>
          </div>

          {session.description && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-900">About this session</h3>
              <p className="text-sm leading-relaxed text-zinc-600">{session.description}</p>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {message}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!user ? (
            <Link href="/login" className="block">
              <Button className="w-full" size="lg">
                Sign in to book
              </Button>
            </Link>
          ) : started ? null : isCreatorOfThis ? null : session.seats_left === 0 ? null : (
            <Button onClick={book} disabled={busy} className="w-full" size="lg">
              {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {busy ? "Booking..." : "Book a seat"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
