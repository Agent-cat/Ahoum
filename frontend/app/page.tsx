"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Users, ArrowRight, PlusCircle } from "lucide-react";

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

  if (error)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );

  if (!sessions)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );

  if (sessions.length === 0)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Calendar className="h-12 w-12 text-zinc-300" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">No sessions yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Be the first to create a session.</p>
        </div>
        <Link href="/creator">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create a session
          </Button>
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Upcoming sessions</h1>
          <p className="text-sm text-zinc-500">Browse and book available sessions</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => (
          <Link key={s.id} href={`/sessions/${s.id}`} className="group block">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="group-hover:text-zinc-700">{s.title}</CardTitle>
                <CardDescription>by {s.creator_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Calendar className="h-4 w-4" />
                  {new Date(s.starts_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <Users className="h-4 w-4" />
                    {s.seats_left} of {s.capacity} seats
                  </div>
                  <Badge variant={s.seats_left === 0 ? "destructive" : "secondary"}>
                    {s.seats_left === 0 ? "Full" : `${s.seats_left} left`}
                  </Badge>
                </div>
                <div className="flex items-center text-sm font-medium text-zinc-900 group-hover:text-zinc-600">
                  View details
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
