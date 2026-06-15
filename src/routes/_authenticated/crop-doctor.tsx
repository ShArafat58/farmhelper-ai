import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <Card className="mt-8 border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Coming soon.
          </CardContent>
        </Card>
      </section>
    </SiteLayout>
  );
}

export const Route = createFileRoute("/_authenticated/crop-doctor")({
  head: () => ({ meta: [{ title: "Crop Doctor — FarmHelper" }] }),
  component: () => <PlaceholderPage title="Crop Doctor" />,
});
