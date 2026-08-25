"use client";

import { useEffect, useState } from "react";
import { api, currentUser, saveAuth } from "@/src/lib/api";
import { useAuth } from "@/src/auth";

export default function LoginPage() {
  const { setUser } = useAuth();
  const [authorizeUrl, setAuthorizeUrl] = useState("");
  const [oauthError, setOauthError] = useState("");
  const [devUsername, setDevUsername] = useState("");
  const [devRole, setDevRole] = useState<"user" | "creator">("user");
  const [devEnabled, setDevEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/github/url/")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("GitHub OAuth is not configured."))))
      .then((d) => {
        setAuthorizeUrl(d.authorize_url);
        localStorage.setItem("oauth_state_url", d.authorize_url);
      })
      .catch((e) => setOauthError(e.message));
    // dev login availability
    fetch("/api/auth/dev-login/", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(() => setDevEnabled(true))
      .catch(() => setDevEnabled(false));
  }, []);

  async function devLogin() {
    if (!devUsername.trim()) return;
    setBusy(true);
    try {
      const data = await api("/auth/dev-login/", {
        method: "POST",
        body: { username: devUsername.trim(), role: devRole },
      });
      saveAuth(data);
      setUser(currentUser());
      window.location.href = "/";
    } catch (e: any) {
      setOauthError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <h1>Sign in</h1>
      {authorizeUrl ? (
        <a className="btn" href={authorizeUrl}>
          Continue with GitHub
        </a>
      ) : (
        <button className="btn" disabled>
          GitHub sign-in unavailable
        </button>
      )}
      {oauthError && (
        <p className="error">
          {oauthError} <a href="/login">Retry</a>
        </p>
      )}
      <p className="muted">You will be redirected to github.com to authorize this app.</p>

      {devEnabled && (
        <div className="card dev-login">
          <h2>Development login</h2>
          <p className="muted">Only available when DEV_LOGIN_ENABLED=1.</p>
          <input
            placeholder="username"
            value={devUsername}
            onChange={(e) => setDevUsername(e.target.value)}
          />
          <select value={devRole} onChange={(e) => setDevRole(e.target.value as any)}>
            <option value="user">User</option>
            <option value="creator">Creator</option>
          </select>
          <button className="btn small" onClick={devLogin} disabled={busy}>
            Log in
          </button>
        </div>
      )}
    </div>
  );
}
