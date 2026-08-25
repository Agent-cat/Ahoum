"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Spinner } from "@/src/components/ui/spinner";
import { User, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user, ready, setUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-zinc-400" />
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <User className="h-12 w-12 text-zinc-300" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sign in required</h2>
          <p className="mt-1 text-sm text-zinc-500">Sign in to manage your profile.</p>
        </div>
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    );

  const current = displayName || user.display_name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const updated = await api("/me/", {
        method: "PATCH",
        body: { display_name: current },
      });
      setUser({ ...user!, ...updated });
      setMessage("Profile saved successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Profile</h1>
        <p className="text-sm text-zinc-500">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url} alt={user.username} />
              <AvatarFallback className="text-lg">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.display_name || user.username}</CardTitle>
              <CardDescription>{user.email || user.username}</CardDescription>
              <div className="mt-1 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-700 capitalize">
                {user.role}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={current}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={150}
                placeholder="Enter display name"
              />
            </div>

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

            <Button type="submit" disabled={busy}>
              {busy ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
