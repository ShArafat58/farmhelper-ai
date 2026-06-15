import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Stethoscope,
  TrendingUp,
  CalendarDays,
  Store,
  MessagesSquare,
  LayoutDashboard,
  Sprout,
  Building2,
  ShieldCheck,
  Globe2,
  Languages,
  Cpu,
  Database,
  CircleDollarSign,
  Megaphone,
  Percent,
  BarChart3,
  Leaf,
} from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview — FarmHelper: Your Smart Farming Companion" },
      {
        name: "description",
        content:
          "FarmHelper is an AI co-pilot for smallholder farmers worldwide: diagnose crops, plan profitable seasons, follow a smart calendar, and sell direct to buyers.",
      },
      { property: "og:title", content: "FarmHelper — Product Overview" },
      {
        property: "og:description",
        content:
          "AI Crop Doctor, Profit Planner, Smart Calendar, Direct Marketplace, and Community Q&A — built for smallholder farmers in any country.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/overview" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FarmHelper — Product Overview" },
      {
        name: "twitter:description",
        content:
          "The AI farming co-pilot for smallholders: diagnose, plan, schedule, and sell smarter.",
      },
    ],
    links: [{ rel: "canonical", href: "/overview" }],
  }),
  component: OverviewPage,
});

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
      )}
    </div>
  );
}

function OverviewPage() {
  const features = [
    {
      icon: Stethoscope,
      title: "AI Crop Doctor",
      body: "Snap a photo of a sick leaf. Get disease, cause, treatment, and prevention in seconds.",
    },
    {
      icon: TrendingUp,
      title: "AI Profit Planner",
      body: "Region-aware ranking of the most profitable crops for your land, season, and currency.",
    },
    {
      icon: CalendarDays,
      title: "AI Smart Calendar",
      body: "Auto-generated sowing, watering, fertilizing, and harvest tasks tailored to your plot.",
    },
    {
      icon: Store,
      title: "Direct Marketplace",
      body: "Live regional prices and a classifieds board — sell direct, skip the middleman.",
    },
    {
      icon: MessagesSquare,
      title: "Community Q&A",
      body: "Ask farmers nearby. Every post also gets an instant AI answer to unblock you fast.",
    },
    {
      icon: LayoutDashboard,
      title: "Reporting Dashboard",
      body: "Krishi Score, activity trends, upcoming tasks, and farm KPIs in one clean view.",
    },
  ];

  const users = [
    {
      icon: Sprout,
      title: "Farmers",
      body: "Smallholders managing 0.5–10 acres who need timely, localized guidance and fair prices.",
    },
    {
      icon: Building2,
      title: "Agri-input Sellers (B2B)",
      body: "Seed, fertilizer, and equipment companies reaching verified farmers with targeted recommendations.",
    },
    {
      icon: ShieldCheck,
      title: "Admins",
      body: "Moderate listings and reports, monitor platform health, and keep the marketplace safe.",
    },
  ];

  const revenue = [
    {
      icon: CircleDollarSign,
      title: "Freemium Subscription",
      body: "Premium AI quota, advanced profit planning, and real-time price alerts.",
    },
    {
      icon: Megaphone,
      title: "B2B Ads & Recommendations",
      body: "Verified product placements for agri-input companies targeting the right crop and region.",
    },
    {
      icon: Percent,
      title: "Marketplace Commission",
      body: "Small fee on facilitated direct sales between farmers and buyers.",
    },
    {
      icon: BarChart3,
      title: "Aggregated Data",
      body: "Anonymized crop & yield insights for lenders, insurers, and supply-chain partners.",
    },
  ];

  const stack = [
    "TanStack Start (React 19)",
    "Tailwind CSS v4",
    "Lovable Cloud (Postgres + Auth + RLS + Storage)",
    "Lovable AI Gateway",
    "SSR + createServerFn",
  ];

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Leaf className="h-3.5 w-3.5" /> Product Overview
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              FarmHelper — Your Smart Farming Companion
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              An AI co-pilot that helps smallholder farmers diagnose crops, plan profit, follow a
              smart calendar, and sell direct — in any country, in their language.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/auth/signup">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          eyebrow="The Problem"
          title="Smallholders are flying blind — and underpaid."
          body="Across the globe, smallholder farmers lack timely, localized guidance on crop diseases and the most profitable crops to grow. When harvest comes, middlemen capture most of the margin."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              stat: "500M+",
              label: "smallholder farms worldwide feed most of the developing world",
            },
            {
              stat: "20–40%",
              label: "crop losses from preventable disease and bad timing",
            },
            {
              stat: "Up to 60%",
              label: "of farm-gate value captured by middlemen, not the farmer",
            },
          ].map((b) => (
            <Card key={b.stat} className="border-border/70 bg-card">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary">{b.stat}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* TARGET USERS */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader eyebrow="Who it's for" title="Built for the whole agri ecosystem" />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {users.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/70 transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          eyebrow="Features"
          title="Everything a smallholder needs, in one app"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/70 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW THE AI WORKS */}
      <section className="border-y border-border bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeader
            eyebrow="How the AI works"
            title="Region, season, and language — handled automatically"
            body="The AI is the engine that makes FarmHelper work in any country. Nothing about seasons is hard-coded."
          />
          <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
            {[
              {
                icon: Globe2,
                title: "1. Input",
                body: "Your crop, country, region, current month, currency, and preferred language.",
              },
              {
                icon: Cpu,
                title: "2. createServerFn → Lovable AI Gateway",
                body: "A server-side function sends a strict JSON prompt. Your data and keys never leave the server.",
              },
              {
                icon: Languages,
                title: "3. Localized result",
                body: "Structured advice in English worldwide, or Bengali/English for Bangladesh.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/70 bg-card">
                <CardContent className="p-6">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS MODEL */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          eyebrow="Business Model"
          title="A four-stream path to $100M"
          body="A global, low-content-cost moat: the AI generates localized guidance on demand, so launching a new country costs almost nothing."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {revenue.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/70 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* TECH STACK */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeader eyebrow="Under the hood" title="Modern, scalable, secure" />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {stack.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="gap-1.5 border border-border bg-background px-3 py-1.5 text-sm font-medium"
              >
                <Database className="h-3.5 w-3.5 text-primary" />
                {s}
              </Badge>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Button size="lg" asChild>
              <Link to="/auth/signup">
                Start using FarmHelper <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
