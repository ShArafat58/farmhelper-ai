import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — FarmHelper" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();

  const counts = useQuery({
    queryKey: ["admin-counts"],
    enabled: isAdmin,
    queryFn: async () => {
      const [users, listings, posts, diagnoses] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("market_listings").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase.from("diagnoses").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        listings: listings.count ?? 0,
        posts: posts.count ?? 0,
        diagnoses: diagnoses.count ?? 0,
      };
    },
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

  const stats = [
    { key: "users", value: counts.data?.users ?? "—" },
    { key: "listings", value: counts.data?.listings ?? "—" },
    { key: "posts", value: counts.data?.posts ?? "—" },
    { key: "diagnoses", value: counts.data?.diagnoses ?? "—" },
  ];

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.subtitle")}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`admin.stats.${s.key}`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("admin.moderationPlaceholder")}
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
