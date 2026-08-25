"use client";

import Link from "next/link";
import { useAuth } from "@/src/auth";

export function Nav() {
  const { user, ready, logout } = useAuth();

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Sessions Marketplace
      </Link>
      <div className="nav-links">
        {ready && user ? (
          <>
            <Link href="/bookings">My bookings</Link>
            {user.role === "creator" && <Link href="/creator">Creator</Link>}
            <Link href="/profile">{user.display_name || user.username}</Link>
            <button onClick={logout} className="btn small">
              Log out
            </button>
          </>
        ) : (
          ready && (
            <Link href="/login" className="btn small">
              Sign in
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
