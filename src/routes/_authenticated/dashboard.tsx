import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  Sprout, ListChecks, Stethoscope, Store, MessagesSquare,
  CalendarDays, TrendingUp, Trophy, Award,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { dashboardOverview } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FarmHelper" }] }),
  component: DashboardPage,
});

const QUICK_LINKS = [
  { to: "/farm", icon: Sprout, key: "farm" },
  { to: "/calendar", icon: CalendarDays, key: "calendar" },
  { to: "/crop-doctor", icon: Stethoscope, key: "cropDoctor" },
  { to: "/profit-planner", icon: TrendingUp, key: "profitPlanner" },
  { to: "/market", icon: Store, key: "market" },
  { to: "/community", icon: MessagesSquare, key: "community" },
] as const;

function DashboardPage() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const name = profile?.full_name ?? user?.email ?? "";
  const fn = useServerFn(dashboardOverview);
  const q = useQuery({ queryKey: ["dashboard-overview"], queryFn: () => fn() });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {t("dashboard.welcome", { name })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
          {q.data && (
            <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2 shadow-sm">
              <Trophy className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">{t("dashboard.krishiScore")}</div>
                <div className="text-xl font-bold leading-none">{q.data.score}</div>
              </div>
            </div>
          )}
        </div>

        {q.isLoading && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}

        {q.isError && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{t("common.loadError")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        {q.data && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("dashboard.stats.plots")} value={q.data.counts.plots} icon={Sprout} />
              <StatCard label={t("dashboard.stats.tasksPending")} value={q.data.counts.tasksPending} icon={ListChecks} />
              <StatCard label={t("dashboard.stats.listings")} value={q.data.counts.listingsActive} icon={Store} />
              <StatCard label={t("dashboard.stats.diagnoses")} value={q.data.counts.diagnoses} icon={Stethoscope} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("dashboard.charts.activity")}</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={q.data.activitySeries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("dashboard.charts.tasks")} />
                      <Bar dataKey="done" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} name={t("dashboard.charts.done")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4" /> {t("dashboard.badges")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {q.data.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.noBadges")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {q.data.badges.map((b) => (
                        <Badge key={b.code} variant="secondary" className="capitalize">
                          {b.code.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {t("dashboard.upcoming")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {q.data.upcomingTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dashboard.noUpcoming")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {q.data.upcomingTasks.map((t) => (
                        <li key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <span className="truncate">{t.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.due_date ?? "—"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("dashboard.quickLinks")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {QUICK_LINKS.map(({ to, icon: Icon, key }) => (
                      <Button key={key} variant="outline" className="h-auto justify-start gap-2 py-3" asChild>
                        <Link to={to}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate text-xs">{t(`nav.${key}`)}</span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
