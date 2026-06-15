import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Menu, X, Globe } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { SupportedLang } from "@/i18n";

const NAV_LINKS = [
  { key: "home", to: "/" },
  { key: "dashboard", to: "/dashboard" },
  { key: "cropDoctor", to: "/crop-doctor" },
  { key: "profitPlanner", to: "/profit-planner" },
  { key: "calendar", to: "/calendar" },
  { key: "market", to: "/market" },
  { key: "community", to: "/community" },
] as const;

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const showLangSwitcher = !!profile && profile.country === "BD";

  async function setLang(lang: SupportedLang) {
    await i18n.changeLanguage(lang);
    if (profile && profile.preferred_language !== lang) {
      await supabase
        .from("profiles")
        .update({ preferred_language: lang })
        .eq("id", profile.id);
      await refreshProfile();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <BrandLogo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ key, to }) => {
              const active = pathname === to;
              return (
                <Link
                  key={key}
                  to={to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {t(`nav.${key}`)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {showLangSwitcher && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs">{i18n.language === "bn" ? "বাংলা" : "EN"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang("en")}>
                  {t("language.en")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("bn")}>
                  {t("language.bn")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {profile?.full_name?.split(" ")[0] ?? user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">{t("nav.dashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">{t("nav.settings")}</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">{t("nav.admin")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth/signup">{t("nav.signup")}</Link>
              </Button>
            </div>
          )}

          <button
            type="button"
            aria-label={t("nav.menu")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map(({ key, to }) => (
              <Link
                key={key}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t(`nav.${key}`)}
              </Link>
            ))}
            {!user && (
              <div className="mt-2 flex gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/auth/login" onClick={() => setMobileOpen(false)}>
                    {t("nav.login")}
                  </Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/auth/signup" onClick={() => setMobileOpen(false)}>
                    {t("nav.signup")}
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
