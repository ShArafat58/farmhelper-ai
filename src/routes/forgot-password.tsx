import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import authBg from "@/assets/auth-bg.jpg.asset.json";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — FarmHelper" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError(t("auth.errors.emailInvalid"));
      return;
    }
    setEmailError(undefined);
    setSubmitting(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage: `url("${authBg.url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/35 to-primary/30" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/15 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-bold text-white drop-shadow">{t("forgotPassword.title")}</h1>
          <p className="mt-1 text-sm text-white/80">{t("forgotPassword.subtitle")}</p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-md border border-white/30 bg-white/20 p-4 text-sm text-white">
                <p className="font-semibold">{t("forgotPassword.successTitle")}</p>
                <p className="mt-1 text-white/85">{t("forgotPassword.successBody")}</p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate({ to: "/reset-password", search: { email } })}
              >
                {t("forgotPassword.continueToReset")}
              </Button>
              <Link to="/auth/login" className="block text-center text-sm text-white/80 underline-offset-2 hover:underline">
                {t("forgotPassword.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">{t("forgotPassword.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                />
                {emailError && <p className="mt-1 text-xs text-red-200">{emailError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("forgotPassword.sending") : t("forgotPassword.submit")}
              </Button>
              <Link to="/auth/login" className="block text-center text-sm text-white/80 underline-offset-2 hover:underline">
                {t("forgotPassword.backToLogin")}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
