"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, saveAuth } from "@/src/lib/api";

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(
        `GitHub sign-in failed: ${oauthError === "access_denied" ? "you cancelled the authorization" : oauthError}.`
      );
      return;
    }
    if (!code) {
      setError("Missing authorization code.");
      return;
    }

    api("/auth/github/", { method: "POST", body: { code, state: state ?? "" } })
      .then((data) => {
        saveAuth(data);
        router.replace("/");
      })
      .catch((e) => setError(e.message || "Sign-in failed."));
  }, [params, router]);

  return (
    <div>
      <h1>Signing you in…</h1>
      {error ? (
        <div className="error">
          <p>{error}</p>
          <a href="/login">Back to sign in</a>
        </div>
      ) : (
        <p>Exchanging your GitHub code for a session token.</p>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Callback />
    </Suspense>
  );
}
