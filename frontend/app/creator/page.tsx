"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Spinner } from "@/src/components/ui/spinner";
import { Calendar, Users, Pencil, Trash2, PlusCircle, AlertCircle, CheckCircle2 } from "lucide-react";

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

  if (!ready)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <Pencil className="h-12 w-12 text-zinc-300" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sign in required</h2>
          <p className="mt-1 text-sm text-zinc-500">Sign in as a creator to manage sessions.</p>
        </div>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );

  if (user.role !== "creator")
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Creator dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">You need a creator account to manage sessions.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-center text-sm text-zinc-600">
              Switch to a creator account to start creating and managing sessions.
            </p>
            <Button
              className="w-full"
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
            </Button>
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Creator dashboard</h1>
        <p className="text-sm text-zinc-500">Create and manage your sessions</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <SessionForm
        editing={editingId ? sessions?.find((s) => s.id === editingId) ?? null : null}
        onDone={() => {
          setEditingId(null);
          load();
        }}
      />

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Calendar className="h-5 w-5" />
          My sessions
        </h2>
        {!sessions && (
          <div className="flex min-h-[200px] items-center justify-center">
            <Spinner className="h-8 w-8 text-zinc-400" />
          </div>
        )}
        {sessions?.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            No sessions yet.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions?.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle>{s.title}</CardTitle>
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
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Users className="h-4 w-4" />
                  {s.booked_count} / {s.capacity} booked
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(s.id)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
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
  const [startsAt, setStartsAt] = useState(editing ? editing.starts_at.slice(0, 16) : "");
  const [capacity, setCapacity] = useState(String(editing?.capacity ?? 10));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setStartsAt(editing ? editing.starts_at.slice(0, 16) : "");
    setCapacity(String(editing?.capacity ?? 10));
  }, [editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
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
        setSuccess("Session updated successfully.");
      } else {
        await api("/sessions/", { method: "POST", body });
        setSuccess("Session created successfully.");
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          {editing ? `Edit "${editing.title}"` : "Create a session"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Session title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Session description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts at</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {busy ? "Saving..." : editing ? "Save changes" : "Create session"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
