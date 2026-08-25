"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Calendar, LayoutDashboard, LogOut, User } from "lucide-react";

export function Nav() {
  const { user, ready, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-300 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900 hover:no-underline"
        >
          <Calendar className="h-5 w-5" />
          Sessions
        </Link>
        <div className="flex items-center gap-3">
          {ready && user ? (
            <>
              <Link href="/bookings">
                <Button variant="ghost" size="sm">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  Bookings
                </Button>
              </Link>
              {user.role === "creator" && (
                <Link href="/creator">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Creator
                  </Button>
                </Link>
              )}
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                    <AvatarFallback className="text-xs">
                      {(user.display_name || user.username).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.display_name || user.username}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>
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
