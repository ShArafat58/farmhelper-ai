import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import authBg from "@/assets/auth-bg.jpg.asset.json";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [{ title: "Log in — FarmHelper" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t("auth.errors.emailInvalid");
    if (password.length < 8) next.password = t("auth.errors.passwordShort");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setErrors({ form: error.message });
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
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
          <h1 className="text-2xl font-bold text-white drop-shadow">{t("auth.loginTitle")}</h1>
          <p className="mt-1 text-sm text-white/80">{t("auth.loginSubtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-200">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-white">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-200">{errors.password}</p>
              )}
            </div>

            {errors.form && (
              <p className="text-sm text-red-200">{errors.form}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.loggingIn") : t("auth.submitLogin")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/80">
            {t("auth.noAccount")}{" "}
            <Link to="/auth/signup" className="font-medium text-white underline-offset-2 hover:underline">
              {t("nav.signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
