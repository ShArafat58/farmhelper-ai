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
import { SECURITY_QUESTION_KEYS } from "@/lib/security-questions";
import { setMySecurityAnswers } from "@/lib/security.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [{ title: "Sign up — FarmHelper" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveAnswers = useServerFn(setMySecurityAnswers);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState<string>("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [q1, setQ1] = useState<string>("");
  const [q2, setQ2] = useState<string>("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    country?: string;
    sq?: string;
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
    if (!q1 || !q2) next.sq = t("securityQuestions.mustDiffer");
    else if (q1 === q2) next.sq = t("securityQuestions.mustDiffer");
    else if (!a1.trim() || !a2.trim()) next.sq = t("securityQuestions.answerRequired");
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
    if (error) {
      setSubmitting(false);
      setErrors({ form: error.message });
      toast.error(error.message);
      return;
    }
    // Sign in to obtain a session (in case email confirmation is disabled and signUp didn't return one)
    try {
      await saveAnswers({
        data: {
          pairs: [
            { questionKey: q1, answer: a1 },
            { questionKey: q2, answer: a2 },
          ],
        },
      });
    } catch (err) {
      // Non-fatal: account is created; user can set in Settings.
      console.warn("Could not save security questions at signup:", err);
    }
    setSubmitting(false);
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
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/35 to-primary/30" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        <div className="rounded-2xl border border-white/25 bg-white/15 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-bold text-white drop-shadow">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-white/80">{t("auth.signupSubtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-white">{t("auth.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-200">{errors.fullName}</p>
              )}
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-200">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="country" className="text-white">{t("auth.country")}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country" aria-invalid={!!errors.country} className="border-white/30 bg-white/20 text-white focus:ring-white/60">
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
                <p className="mt-1 text-xs text-red-200">{errors.country}</p>
              )}
            </div>

            {isBD && (
              <div>
                <Label htmlFor="language" className="text-white">{t("auth.preferredLanguage")}</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as "bn" | "en")}
                >
                  <SelectTrigger id="language" className="border-white/30 bg-white/20 text-white focus:ring-white/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">{t("language.bn")}</SelectItem>
                    <SelectItem value="en">{t("language.en")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-lg border border-white/25 bg-white/10 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-white">{t("securityQuestions.sectionTitle")}</p>
                <p className="text-xs text-white/75">{t("securityQuestions.sectionHelp")}</p>
              </div>
              {[
                { q: q1, setQ: setQ1, a: a1, setA: setA1, qLabel: "question1", aLabel: "answer1", other: q2 },
                { q: q2, setQ: setQ2, a: a2, setA: setA2, qLabel: "question2", aLabel: "answer2", other: q1 },
              ].map((row, idx) => (
                <div key={idx} className="space-y-2">
                  <div>
                    <Label className="text-white">{t(`securityQuestions.${row.qLabel}`)}</Label>
                    <Select value={row.q} onValueChange={row.setQ}>
                      <SelectTrigger className="border-white/30 bg-white/20 text-white focus:ring-white/60">
                        <SelectValue placeholder={t("securityQuestions.pickQuestion")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SECURITY_QUESTION_KEYS.map((k) => (
                          <SelectItem key={k} value={k} disabled={k === row.other}>
                            {t(`securityQuestions.items.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">{t(`securityQuestions.${row.aLabel}`)}</Label>
                    <Input
                      value={row.a}
                      onChange={(e) => row.setA(e.target.value)}
                      className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                    />
                  </div>
                </div>
              ))}
              {errors.sq && <p className="text-xs text-red-200">{errors.sq}</p>}
            </div>

            {errors.form && (
              <p className="text-sm text-red-200">{errors.form}</p>
            )}


            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.signingUp") : t("auth.submitSignup")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/80">
            {t("auth.haveAccount")}{" "}
            <Link to="/auth/login" className="font-medium text-white underline-offset-2 hover:underline">
              {t("nav.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
