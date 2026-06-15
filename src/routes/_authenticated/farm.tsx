import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sprout } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { listPlots, createPlot, updatePlot, deletePlot } from "@/lib/farm.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/farm")({
  head: () => ({ meta: [{ title: "My Farm — FarmHelper" }] }),
  component: FarmPage,
});

type Plot = {
  id: string;
  name: string;
  area: number | null;
  crop_name: string | null;
  country: string | null;
  region: string | null;
  planted_at: string | null;
};

function FarmPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listPlots);
  const createFn = useServerFn(createPlot);
  const updateFn = useServerFn(updatePlot);
  const deleteFn = useServerFn(deletePlot);

  const q = useQuery({ queryKey: ["plots"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plot | null>(null);

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plots"] });
      toast.success("Plot added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plots"] });
      toast.success("Plot updated");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plots"] });
      toast.success("Plot deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Farm</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your plots and what's growing on them.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> Add plot</Button>
            </DialogTrigger>
            <PlotDialog
              initial={editing}
              defaultCountry={profile?.country ?? ""}
              defaultRegion={profile?.region ?? ""}
              submitting={create.isPending || update.isPending}
              onSubmit={(values) => {
                if (editing) update.mutate({ data: { id: editing.id, ...values } });
                else create.mutate({ data: values });
              }}
            />
          </Dialog>
        </div>

        <div className="mt-6">
          {q.isLoading && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          )}
          {q.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">Could not load your plots.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>Retry</Button>
            </div>
          )}
          {q.data && q.data.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Sprout className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No plots yet — add your first.</p>
            </div>
          )}
          {q.data && q.data.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {q.data.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{p.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">{p.area ?? "—"} {profile?.area_unit ?? ""}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      {p.crop_name ?? "—"} · {p.region ?? p.country ?? "—"}
                    </div>
                    {p.planted_at && <div className="mt-1 text-xs text-muted-foreground">Planted {p.planted_at}</div>}
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(p as Plot); setOpen(true); }}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this plot?")) del.mutate({ data: { id: p.id } });
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
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

function PlotDialog({
  initial,
  defaultCountry,
  defaultRegion,
  submitting,
  onSubmit,
}: {
  initial: Plot | null;
  defaultCountry: string;
  defaultRegion: string;
  submitting: boolean;
  onSubmit: (v: {
    name: string; area: number; crop_name: string;
    country: string | null; region: string | null; planted_at: string | null;
  }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [area, setArea] = useState(initial?.area?.toString() ?? "");
  const [crop, setCrop] = useState(initial?.crop_name ?? "");
  const [country, setCountry] = useState(initial?.country ?? defaultCountry);
  const [region, setRegion] = useState(initial?.region ?? defaultRegion);
  const [planted, setPlanted] = useState(initial?.planted_at ?? "");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = Number(area);
    if (!name.trim()) return setErr("Name is required.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Area must be greater than zero.");
    if (!crop.trim()) return setErr("Crop is required.");
    onSubmit({
      name: name.trim(),
      area: n,
      crop_name: crop.trim(),
      country: country.trim() ? country.trim().toUpperCase().slice(0, 2) : null,
      region: region.trim() || null,
      planted_at: planted || null,
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit plot" : "Add plot"}</DialogTitle>
      </DialogHeader>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>Area</Label><Input type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Crop</Label><Input value={crop} onChange={(e) => setCrop(e.target.value)} maxLength={80} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-2"><Label>Country (ISO-2)</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} /></div>
          <div className="grid gap-2"><Label>Region</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={80} /></div>
        </div>
        <div className="grid gap-2"><Label>Planted on</Label><Input type="date" value={planted} onChange={(e) => setPlanted(e.target.value)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
