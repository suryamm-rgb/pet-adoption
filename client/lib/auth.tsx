"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "./api";
import { closeSocket } from "./socket";
import type { Role, User } from "./types";

type RegisterInput = { name: string; email: string; phone?: string; password: string; role: "owner" | "caretaker"; city?: string };
type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  addRole: (role: Role) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        return (await api<{ user: User }>("/auth/me")).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });

  // Switching accounts must drop every cached query except the session itself, which the provider observes.
  const setUser = useCallback(
    (u: User | null) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      qc.setQueryData(["me"], u);
    },
    [qc],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user: data ?? null,
      loading: isLoading,
      async login(email, password) {
        const { user } = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } });
        setUser(user);
        return user;
      },
      async register(input) {
        const { user } = await api<{ user: User }>("/auth/register", { method: "POST", body: input });
        setUser(user);
        return user;
      },
      async logout() {
        await api("/auth/logout", { method: "POST" });
        closeSocket();
        setUser(null);
      },
      async addRole(role) {
        const { user } = await api<{ user: User }>("/auth/roles", { method: "POST", body: { role } });
        setUser(user);
      },
    }),
    [data, isLoading, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const homeFor = (user: User) =>
  user.roles.includes("admin") ? "/admin" : user.roles.includes("caretaker") && !user.roles.includes("owner") ? "/caretaker" : "/owner";

/** Redirects anonymous visitors to /login and returns the user once known. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);
  return { user, loading };
}
