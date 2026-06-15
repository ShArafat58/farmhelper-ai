import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldAlert, EyeOff, Check, X } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { adminStats, listReports, moderateListing, resolveReport } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — FarmHelper" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const statsFn = useServerFn(adminStats);
  const reportsFn = useServerFn(listReports);
  const modListing = useServerFn(moderateListing);
  const resolveFn = useServerFn(resolveReport);

  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn(), enabled: isAdmin });
  const reportsQ = useQuery({ queryKey: ["admin-reports"], queryFn: () => reportsFn(), enabled: isAdmin });

  const hideMut = useMutation({
    mutationFn: modListing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(t("admin.actions.hidden"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolveMut = useMutation({
    mutationFn: resolveFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success(t("admin.actions.resolved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteLayout>
    );
  }

  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-2xl font-bold">{t("admin.deniedTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.deniedBody")}</p>
        </div>
      </SiteLayout>
    );
  }

  const stats = statsQ.data;
  const cards = [
    { key: "users", value: stats?.users },
    { key: "listings", value: stats?.listings },
    { key: "posts", value: stats?.posts },
    { key: "diagnoses", value: stats?.diagnoses },
    { key: "openReports", value: stats?.openReports },
  ];

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.subtitle")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t(`admin.stats.${c.key}`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsQ.isLoading ? <Skeleton className="h-7 w-12" /> : c.value ?? "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("admin.queue.title")}</h2>
          </div>

          {reportsQ.isLoading && (
            <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          )}
          {reportsQ.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">{t("common.loadError")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => reportsQ.refetch()}>
                {t("common.retry")}
              </Button>
            </div>
          )}
          {reportsQ.data && reportsQ.data.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {t("admin.queue.empty")}
              </CardContent>
            </Card>
          )}
          {reportsQ.data && reportsQ.data.length > 0 && (
            <div className="space-y-3">
              {reportsQ.data.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold truncate">
                          {r.listing?.crop_name ?? t("admin.queue.deletedListing")}
                        </span>
                        {r.listing && (
                          <Badge variant={r.listing.status === "active" ? "default" : "secondary"}>
                            {r.listing.status}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("admin.queue.reason")}: {r.reason || "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("admin.queue.reportedBy")}: {r.reporter?.full_name ?? r.reporter_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.listing && r.listing.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={hideMut.isPending}
                          onClick={() => hideMut.mutate({ data: { listing_id: r.listing_id, action: "hide" } })}
                        >
                          <EyeOff className="mr-1 h-3 w-3" /> {t("admin.queue.hide")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={resolveMut.isPending}
                        onClick={() => resolveMut.mutate({ data: { report_id: r.id, status: "resolved" } })}
                      >
                        <Check className="mr-1 h-3 w-3" /> {t("admin.queue.resolve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resolveMut.isPending}
                        onClick={() => resolveMut.mutate({ data: { report_id: r.id, status: "dismissed" } })}
                      >
                        <X className="mr-1 h-3 w-3" /> {t("admin.queue.dismiss")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
