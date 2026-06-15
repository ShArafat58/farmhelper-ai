import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FarmHelper" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const name = profile?.full_name ?? user?.email ?? "";

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("dashboard.welcome", { name })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>

        <Card className="mt-8 border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("dashboard.placeholderCard")}
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}
