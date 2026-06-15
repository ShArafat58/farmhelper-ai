import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SECURITY_QUESTION_KEYS } from "@/lib/security-questions";
import { getMySecurityQuestionKeys, setMySecurityAnswers } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — FarmHelper" }] }),
  component: SettingsPage,
});

const AREA_UNITS = ["acre", "hectare", "bigha", "katha"];
const CURRENCIES = ["USD", "BDT", "INR", "PKR", "NPR", "LKR", "KES", "NGN", "ZAR", "EUR", "GBP"];

function SettingsPage() {
  const { t } = useTranslation();
  const { profile, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [region, setRegion] = useState("");
  const [areaUnit, setAreaUnit] = useState("acre");
  const [currency, setCurrency] = useState("USD");
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setRegion(profile.region ?? "");
      setAreaUnit(profile.area_unit ?? "acre");
      setCurrency(profile.currency ?? "USD");
      setLang((profile.preferred_language as "en" | "bn") ?? "en");
    }
  }, [profile]);

  const isBD = profile?.country === "BD";

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        region: region || null,
        area_unit: areaUnit,
        currency,
        preferred_language: isBD ? lang : "en",
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(t("settings.saveError"));
      return;
    }
    toast.success(t("settings.saved"));
    await refreshProfile();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || !profile) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("settings.subtitle")}</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("settings.profileCard")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label>{t("settings.fullName")}</Label>
              <Input value={profile.full_name ?? ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.country")}</Label>
              <Input value={profile.country ?? ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">{t("settings.region")}</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t("settings.regionPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.areaUnit")}</Label>
              <Select value={areaUnit} onValueChange={setAreaUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREA_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isBD && (
              <div className="grid gap-2">
                <Label>{t("settings.language")}</Label>
                <Select value={lang} onValueChange={(v) => setLang(v as "en" | "bn")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">বাংলা</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t("common.loading") : t("settings.save")}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                {t("nav.logout")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
