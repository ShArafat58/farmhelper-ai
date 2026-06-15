import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import authBg from "@/assets/auth-bg.jpg.asset.json";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [{ title: "Sign up — FarmHelper" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    country?: string;
    form?: string;
  }>({});

  const isBD = country === "BD";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = t("auth.errors.nameRequired");
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = t("auth.errors.emailInvalid");
    if (password.length < 8) next.password = t("auth.errors.passwordShort");
    if (!country) next.country = t("auth.errors.countryRequired");
    setErrors(next);
    if (Object.keys(next).length) return;

    const preferred_language = isBD ? language : "en";

    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName.trim(),
          country,
          preferred_language,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setErrors({ form: error.message });
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-black/25 to-black/30" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-foreground">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">{t("auth.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="country">{t("auth.country")}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country" aria-invalid={!!errors.country}>
                  <SelectValue placeholder={t("auth.countryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="mt-1 text-xs text-destructive">{errors.country}</p>
              )}
            </div>

            {isBD && (
              <div>
                <Label htmlFor="language">{t("auth.preferredLanguage")}</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as "bn" | "en")}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">{t("language.bn")}</SelectItem>
                    <SelectItem value="en">{t("language.en")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {errors.form && (
              <p className="text-sm text-destructive">{errors.form}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.signingUp") : t("auth.submitSignup")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              {t("nav.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
