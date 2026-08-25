"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, saveAuth } from "@/src/lib/api";
import { Spinner } from "@/src/components/ui/spinner";
import { AlertCircle } from "lucide-react";

function GoogleCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(
        `Google sign-in failed: ${oauthError === "access_denied" ? "you cancelled the authorization" : oauthError}.`
      );
      return;
    }
    if (!code) {
      setError("Missing authorization code.");
      return;
    }

    api("/auth/google/", { method: "POST", body: { code, state: state ?? "" } })
      .then((data) => {
        saveAuth(data);
        router.replace("/");
      })
      .catch((e) => setError(e.message || "Sign-in failed."));
  }, [params, router]);

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-center text-2xl font-bold text-zinc-900">Signing you in...</h1>
        {error ? (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <a
              href="/login"
              className="block text-center text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-500">
            <Spinner className="h-8 w-8" />
            <p>Completing your Google sign-in...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
          <Spinner className="h-8 w-8 text-zinc-400" />
        </div>
      }
    >
      <GoogleCallback />
    </Suspense>
  );
}
