"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";

export default function ProfilePage() {
  const { user, ready, setUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!ready) return null;
  if (!user)
    return (
      <p>
        <Link href="/login">Sign in</Link> to manage your profile.
      </p>
    );

  const current = displayName || user.display_name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const updated = await api("/me/", {
        method: "PATCH",
        body: { display_name: current },
      });
      setUser({ ...user!, ...updated });
      setMessage("Profile saved.");
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Profile</h1>
      <p className="muted">
        Signed in as <strong>{user.username}</strong> ({user.role})
      </p>
      <form onSubmit={save} className="card form">
        <label className="muted">
          Display name
          <input
            value={current}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={150}
          />
        </label>
        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn">Save</button>
      </form>
    </div>
  );
}
