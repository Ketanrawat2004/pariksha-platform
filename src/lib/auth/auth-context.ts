import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "superadmin" | "admin" | "invigilator" | "candidate" | "institute";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function defaultLandingFor(roles: AppRole[]): string {
  if (roles.includes("superadmin")) return "/superadmin/dashboard";
  if (roles.includes("admin")) return "/admin/dashboard";
  if (roles.includes("invigilator")) return "/invigilator/dashboard";
  if (roles.includes("institute")) return "/institute/dashboard";
  return "/candidate/dashboard";
}
