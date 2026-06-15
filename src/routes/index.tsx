import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Stethoscope, TrendingUp, CalendarDays, Store, ArrowRight } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmHelper — Your Smart Farming Companion" },
      {
        name: "description",
        content:
          "AI for smallholder farmers: diagnose crop disease, plan profitable crops, get a smart calendar, and sell direct to buyers.",
      },
      { property: "og:title", content: "FarmHelper — Your Smart Farming Companion" },
      {
        property: "og:description",
        content:
          "Diagnose, plan, and sell smarter. The AI farming co-pilot for smallholders worldwide.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const features = [
    { key: "diagnose", icon: Stethoscope },
    { key: "plan", icon: TrendingUp },
    { key: "calendar", icon: CalendarDays },
    { key: "sell", icon: Store },
  ] as const;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t("landing.heroEyebrow")}
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/auth/signup">
                  {t("landing.ctaStart")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth/login">{t("landing.ctaLogin")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("landing.featuresTitle")}
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ key, icon: Icon }) => (
            <Card key={key} className="border-border/70 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.features.${key}.body`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("landing.howTitle")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(["step1", "step2", "step3"] as const).map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {t(`landing.how.${step}Title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`landing.how.${step}Body`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link to="/auth/signup">
                {t("landing.ctaStart")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
