import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getQuestionKeysForEmail,
  resetPasswordWithAnswers,
} from "@/lib/security.functions";
import authBg from "@/assets/auth-bg.jpg.asset.json";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — FarmHelper" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const getQuestions = useServerFn(getQuestionKeysForEmail);
  const resetPw = useServerFn(resetPasswordWithAnswers);

  const [step, setStep] = useState<"email" | "answers" | "neutral">("email");
  const [email, setEmail] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    a0?: string;
    a1?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrors({ email: t("auth.errors.emailInvalid") });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await getQuestions({ data: { email } });
      if (!res.keys || res.keys.length < 2) {
        setStep("neutral");
      } else {
        setKeys(res.keys);
        setStep("answers");
      }
    } catch {
      setStep("neutral");
    } finally {
      setSubmitting(false);
    }
  }

  async function onAnswersSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!answers[0]?.trim()) next.a0 = t("auth.errors.generic");
    if (!answers[1]?.trim()) next.a1 = t("auth.errors.generic");
    if (password.length < 8) next.password = t("auth.errors.passwordShort");
    if (password !== confirm) next.confirm = t("auth.errors.passwordMismatch");
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const res = await resetPw({
        data: {
          email,
          answers: [
            { questionKey: keys[0], answer: answers[0] },
            { questionKey: keys[1], answer: answers[1] },
          ],
          newPassword: password,
        },
      });
      if (res.ok) {
        toast.success(t("forgotPassword.success"));
        navigate({ to: "/auth/login" });
        return;
      }
      if (res.reason === "rate_limited") {
        setErrors({ form: t("forgotPassword.rateLimited") });
      } else if (res.reason === "update_failed") {
        setErrors({ form: t("forgotPassword.updateFailed") });
      } else if (res.reason === "weak_password") {
        setErrors({ password: t("auth.errors.passwordShort") });
      } else {
        setErrors({ form: t("forgotPassword.wrongAnswers") });
      }
    } catch {
      setErrors({ form: t("auth.errors.generic") });
    } finally {
      setSubmitting(false);
    }
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
          {step === "email" && (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow">{t("forgotPassword.title")}</h1>
              <p className="mt-1 text-sm text-white/80">{t("forgotPassword.subtitle")}</p>
              <form onSubmit={onEmailSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white">{t("forgotPassword.email")}</Label>
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
                </Button>
                <Link to="/auth/login" className="block text-center text-sm text-white/80 underline-offset-2 hover:underline">
                  {t("forgotPassword.backToLogin")}
                </Link>
              </form>
            </>
          )}

          {step === "neutral" && (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow">{t("forgotPassword.title")}</h1>
              <div className="mt-6 rounded-md border border-white/30 bg-white/20 p-4 text-sm text-white">
                {t("forgotPassword.neutralMessage")}
              </div>
              <Link to="/auth/login" className="mt-6 block text-center text-sm text-white/80 underline-offset-2 hover:underline">
                {t("forgotPassword.backToLogin")}
              </Link>
            </>
          )}

          {step === "answers" && (
            <>
              <h1 className="text-2xl font-bold text-white drop-shadow">{t("forgotPassword.answersTitle")}</h1>
              <p className="mt-1 text-sm text-white/80">{t("forgotPassword.answersSubtitle")}</p>
              <form onSubmit={onAnswersSubmit} className="mt-6 space-y-4">
                {keys.map((k, i) => (
                  <div key={k}>
                    <Label htmlFor={`a${i}`} className="text-white">
                      {t(`securityQuestions.items.${k}`)}
                    </Label>
                    <Input
                      id={`a${i}`}
                      value={answers[i] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => {
                          const n = [...prev];
                          n[i] = e.target.value;
                          return n;
                        })
                      }
                      aria-invalid={i === 0 ? !!errors.a0 : !!errors.a1}
                      className="border-white/30 bg-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                    />
                  </div>
                ))}
                <div>
                  <Label htmlFor="password" className="text-white">{t("forgotPassword.newPassword")}</Label>
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
                  <Label htmlFor="confirm" className="text-white">{t("forgotPassword.confirmPassword")}</Label>
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
                  {submitting ? t("forgotPassword.resetting") : t("forgotPassword.submitReset")}
                </Button>
                <Link to="/auth/login" className="block text-center text-sm text-white/80 underline-offset-2 hover:underline">
                  {t("forgotPassword.backToLogin")}
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
