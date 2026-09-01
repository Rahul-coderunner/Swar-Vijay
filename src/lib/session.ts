import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "artist" | "kathakar";
export type AccountStatus = "pending" | "approved" | "rejected" | "revoked";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  category: string | null;
  status: AccountStatus;
  license_key: string | null;
  created_at: string;
}

export const roleLabel: Record<AppRole, string> = {
  admin: "Admin",
  artist: "Artist / कलाकार",
  kathakar: "Kathakar / कथाकार",
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sub: any;
    try {
      const res = supabase.auth.onAuthStateChange((_e, s) => {
        setSession(s);
        setLoading(false);
      });
      sub = res?.data;
      supabase.auth.getSession().then(({ data }) => {
        setSession(data?.session ?? null);
        setLoading(false);
      }).catch((e) => {
        console.warn("getSession warn:", e);
        setLoading(false);
      });
    } catch (e) {
      console.warn("useSession warn:", e);
      setLoading(false);
    }
    return () => {
      try {
        sub?.subscription?.unsubscribe();
      } catch {}
    };
  }, []);

  return { session, loading };
}

export async function fetchMe(userId: string) {
  const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  return {
    profile: (profile as Profile | null) ?? null,
    role: (roles?.[0]?.role ?? null) as AppRole | null,
  };
}

export function useMe(userId: string | undefined) {
  return useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: () => fetchMe(userId as string),
  });
}
