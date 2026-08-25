"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, currentUser, setOnUnauthorized, type User } from "./lib/api";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  ready: false,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(currentUser());
    setReady(true);
    setOnUnauthorized(() => {
      setUser(null);
      router.push("/login");
    });
  }, [router]);

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push("/login");
  };

  return <Ctx.Provider value={{ user, ready, setUser, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
