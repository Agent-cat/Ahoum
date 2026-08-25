"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth";
import { Button } from "@/src/components/ui/button";
import { Calendar, Users, Sparkles, ArrowRight } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100">
        <Calendar className="h-10 w-10 text-indigo-600" />
      </div>

      <h1 className="mb-4 text-5xl font-bold tracking-tight text-zinc-800">
        Sessions Marketplace
      </h1>

      <p className="mb-8 max-w-md text-lg text-zinc-500">
        Discover, book, and host sessions. Connect with creators and expand your knowledge.
      </p>

      <div className="mb-12 flex flex-col items-center gap-4 sm:flex-row">
        <Link href="/sessions">
          <Button size="lg" className="px-8">
            Browse Sessions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        {!user && (
          <Link href="/login">
            <Button variant="outline" size="lg" className="px-8">
              Sign in
            </Button>
          </Link>
        )}
      </div>

      <div className="grid max-w-lg gap-6 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-medium text-zinc-800">Browse Sessions</h3>
          <p className="text-sm text-zinc-500">Explore available sessions from creators</p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-medium text-zinc-800">Book a Seat</h3>
          <p className="text-sm text-zinc-500">Reserve your spot in any session</p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <h3 className="font-medium text-zinc-800">Host Sessions</h3>
          <p className="text-sm text-zinc-500">Create and manage your own sessions</p>
        </div>
      </div>
    </div>
  );
}
