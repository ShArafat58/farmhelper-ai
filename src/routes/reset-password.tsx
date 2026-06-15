import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import authBg from "@/assets/auth-bg.jpg.asset.json";

type ResetSearch = { email?: string };

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — FarmHelper" }] }),
  validateSearch: (s: Record<string, unknown>): ResetSearch => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" });
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t("auth.errors.emailInvalid");
    if (!code.trim()) next.code = t("auth.errors.codeRequired");
    else if (!/^\d{6}$/.test(code.trim())) next.code = t("auth.errors.codeInvalid");
    if (password.length < 8) next.password = t("auth.errors.passwordShort");
    if (password !== confirm) next.confirm = t("auth.errors.passwordMismatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });
    if (verifyErr) {
      setSubmitting(false);
      setErrors({ form: t("resetPassword.invalidCode") });
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updErr) {
      setErrors({ form: updErr.message });
      return;
    }
    await supabase.auth.signOut();
    toast.success(t("resetPassword.success"));
    navigate({ to: "/auth/login" });
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
          <h1 className="text-2xl font-bold text-white drop-shadow">{t("resetPassword.title")}</h1>
          <p className="mt-1 text-sm text-white/80">{t("resetPassword.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">{t("resetPassword.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.email && <p className="mt-1 text-xs text-red-200">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="code" className="text-white">{t("resetPassword.code")}</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder={t("resetPassword.codePlaceholder")}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!errors.code}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60 tracking-widest"
              />
              {errors.code && <p className="mt-1 text-xs text-red-200">{errors.code}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-white">{t("resetPassword.newPassword")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.password && <p className="mt-1 text-xs text-red-200">{errors.password}</p>}
            </div>

            <div>
              <Label htmlFor="confirm" className="text-white">{t("resetPassword.confirmPassword")}</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!errors.confirm}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.confirm && <p className="mt-1 text-xs text-red-200">{errors.confirm}</p>}
            </div>

            {errors.form && <p className="text-sm text-red-200">{errors.form}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("resetPassword.submitting") : t("resetPassword.submit")}
            </Button>

            <Link to="/auth/login" className="block text-center text-sm text-white/80 underline-offset-2 hover:underline">
              {t("resetPassword.backToLogin")}
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
