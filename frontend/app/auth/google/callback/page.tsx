"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, saveAuth } from "@/src/lib/api";
import { Spinner } from "@/src/components/ui/spinner";
import { AlertCircle } from "lucide-react";

function GoogleCallback() {
  const params = useSearchParams();
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
        window.location.href = "/";
      })
      .catch((e) => setError(e.message || "Sign-in failed."));
  }, [params]);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-800">Signing you in...</h1>
        {error ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center justify-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <a
              href="/login"
              className="inline-block text-sm font-medium text-indigo-600 underline underline-offset-4 hover:text-indigo-700"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
            <Spinner className="h-8 w-8 text-indigo-400" />
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
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-400" />
        </div>
      }
    >
      <GoogleCallback />
    </Suspense>
  );
}
