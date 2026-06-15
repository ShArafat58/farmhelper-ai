import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profit-planner")({
  head: () => ({ meta: [{ title: "Profit Planner — FarmHelper" }] }),
  component: () => (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profit Planner</h1>
        <Card className="mt-8 border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Coming soon.
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  ),
});
