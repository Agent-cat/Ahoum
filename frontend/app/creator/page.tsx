"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";

type CreatorSession = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  capacity: number;
  booked_count: number;
};

export default function CreatorPage() {
  const { user, ready, setUser } = useAuth();
  const [sessions, setSessions] = useState<CreatorSession[] | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!user || user.role !== "creator") return;
    api("/my/sessions/")
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, [user]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;
  if (!user)
    return (
      <p>
        <Link href="/login">Sign in</Link> as a creator to manage sessions.
      </p>
    );
  if (user.role !== "creator")
    return (
      <div>
        <h1>Creator dashboard</h1>
        <p className="muted">You need a creator account to manage sessions.</p>
        <button
          className="btn"
          onClick={async () => {
            try {
              const updated = await api("/me/", { method: "PATCH", body: { role: "creator" } });
              setUser({ ...user, ...updated });
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          Become a creator
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );

  const remove = async (id: number) => {
    setError("");
    try {
      await api(`/sessions/${id}/`, { method: "DELETE" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h1>Creator dashboard</h1>
      {error && <p className="error">{error}</p>}
      <SessionForm
        editing={
          editingId ? sessions?.find((s) => s.id === editingId) ?? null : null
        }
        onDone={() => {
          setEditingId(null);
          load();
        }}
      />

      <h2>My sessions</h2>
      {!sessions && <p>Loading…</p>}
      {sessions?.length === 0 && <p className="muted">No sessions yet.</p>}
      <ul className="cards">
        {sessions?.map((s) => (
          <li key={s.id} className="card">
            <strong>{s.title}</strong>
            <p>{new Date(s.starts_at).toLocaleString()}</p>
            <p>
              {s.booked_count} / {s.capacity} booked
            </p>
            <div className="row">
              <button className="btn small" onClick={() => setEditingId(s.id)}>
                Edit
              </button>
              <button className="btn small danger" onClick={() => remove(s.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessionForm({
  editing,
  onDone,
}: {
  editing: CreatorSession | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [startsAt, setStartsAt] = useState(
    editing ? editing.starts_at.slice(0, 16) : ""
  );
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 10));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setStartsAt(editing ? editing.starts_at.slice(0, 16) : "");
    setCapacity(String(editing?.capacity ?? 10));
  }, [editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const body = {
      title,
      description,
      starts_at: new Date(startsAt).toISOString(),
      capacity: Number(capacity),
    };
    try {
      if (editing) {
        await api(`/sessions/${editing.id}/`, { method: "PATCH", body });
      } else {
        await api("/sessions/", { method: "POST", body });
      }
      setTitle("");
      setDescription("");
      setStartsAt("");
      setCapacity("10");
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card form">
      <h2>{editing ? `Edit “${editing.title}”` : "Create a session"}</h2>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="muted">
        Starts at
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
      </label>
      <input
        type="number"
        min={1}
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : editing ? "Save changes" : "Create session"}
      </button>
    </form>
  );
}
