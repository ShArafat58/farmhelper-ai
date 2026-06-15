import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { ensureI18n, type SupportedLang } from "@/i18n";

export type Profile = {
  id: string;
  full_name: string | null;
  country: string | null;
  preferred_language: SupportedLang;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, country, preferred_language")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      const p = data as Profile;
      setProfile(p);
      const lang: SupportedLang =
        p.country === "BD" && p.preferred_language === "bn" ? "bn" : "en";
      ensureI18n();
      if (i18n.language !== lang) {
        void i18n.changeLanguage(lang);
      }
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    // Listener first, then session fetch.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer to avoid recursive auth calls in the callback.
        setTimeout(() => void loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        void ensureI18n().changeLanguage("en");
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
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
