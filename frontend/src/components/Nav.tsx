"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Calendar, LogOut, User, Ticket } from "lucide-react";

export function Nav() {
  const { user, ready, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/70 backdrop-blur-xl">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-800 hover:no-underline"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
            <Calendar className="h-4 w-4 text-indigo-600" />
          </div>
          Sessions
        </Link>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-900">
                Home
              </Button>
            </Link>
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-900">
                <Ticket className="mr-1.5 h-4 w-4" />
                Book a Session
              </Button>
            </Link>
            {ready && user && (
              <Link href="/bookings">
                <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-900">
                  My Bookings
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ready && user ? (
            <>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="gap-2 text-zinc-600 hover:text-zinc-900">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                    <AvatarFallback className="bg-indigo-100 text-xs text-indigo-600">
                      {(user.display_name || user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.display_name || user.username}
                </Button>
              </Link>
              <div className="mx-1 h-5 w-px bg-zinc-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-zinc-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            ready && (
              <Link href="/login">
                <Button size="sm">
                  <User className="mr-1.5 h-4 w-4" />
                  Sign in
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
