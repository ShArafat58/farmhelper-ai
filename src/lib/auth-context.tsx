import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { ensureI18n, type SupportedLang } from "@/i18n";

export type Profile = {
  id: string;
  full_name: string | null;
  country: string | null;
  region: string | null;
  area_unit: string;
  currency: string;
  preferred_language: SupportedLang;
  krishi_score: number;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  async function loadProfile(userId: string) {
    const [{ data: pdata }, { data: rdata }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, country, region, area_unit, currency, preferred_language, krishi_score")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (pdata) {
      const p = pdata as Profile;
      setProfile(p);
      const lang: SupportedLang =
        p.country === "BD" && p.preferred_language === "bn" ? "bn" : "en";
      ensureI18n();
      if (i18n.language !== lang) void i18n.changeLanguage(lang);
    } else {
      setProfile(null);
    }
    setIsAdmin(!!rdata?.some((r) => r.role === "admin"));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => void loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        void ensureI18n().changeLanguage("en");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        isAdmin,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
