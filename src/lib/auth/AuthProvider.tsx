import { useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext, type AppRole } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);

  const loadRoles = useCallback(async (userId: string) => {
    setRolesLoading(true);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AppRole));
    setRolesLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setRolesLoading(true);
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setRoles([]);
        setRolesLoading(false);
      }
      if (event === "SIGNED_IN" && sess?.user) {
        setTimeout(() => {
          void import("@/lib/activity-log").then((m) =>
            m.logActivity("signin", { provider: sess.user.app_metadata?.provider ?? "email" }),
          );
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadRoles]);

  const signOut = async () => {
    try {
      const { logActivity } = await import("@/lib/activity-log");
      await logActivity("signout");
    } catch { /* noop */ }
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (r: AppRole) => roles.includes(r);
  const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));

  return (
    <AuthContext.Provider value={{ session, user, roles, loading, rolesLoading, signOut, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  );
}
