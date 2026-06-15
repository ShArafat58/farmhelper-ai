import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, CalendarDays, Sparkles, Loader2 } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listTasks, createTask, deleteTask, toggleTaskStatus } from "@/lib/calendar.functions";
import { listPlots } from "@/lib/farm.functions";
import { cropCalendar } from "@/lib/ai.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — FarmHelper" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const listFn = useServerFn(listTasks);
  const plotsFn = useServerFn(listPlots);
  const createFn = useServerFn(createTask);
  const toggleFn = useServerFn(toggleTaskStatus);
  const delFn = useServerFn(deleteTask);
  const aiFn = useServerFn(cropCalendar);

  const q = useQuery({ queryKey: ["tasks"], queryFn: () => listFn() });
  const plotsQ = useQuery({ queryKey: ["plots"], queryFn: () => plotsFn() });
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCrop, setAiCrop] = useState("");
  const [aiPlot, setAiPlot] = useState<string>("none");

  const aiMut = useMutation({
    mutationFn: aiFn,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("calendar.aiAdded", { count: r.inserted }));
      setAiOpen(false); setAiCrop("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success(t("calendar.added")); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: toggleFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: delFn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success(t("calendar.deleted")); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("calendar.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("calendar.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Sparkles className="mr-1 h-4 w-4" /> {t("calendar.generateAi")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("calendar.aiDialogTitle")}</DialogTitle></DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!aiCrop.trim()) return toast.error(t("calendar.cropRequired"));
                    aiMut.mutate({
                      data: {
                        crop_name: aiCrop.trim(),
                        plot_id: aiPlot === "none" ? null : aiPlot,
                        country: profile?.country ?? null,
                        region: profile?.region ?? null,
                        currency: profile?.currency ?? "USD",
                        language: profile?.country === "BD" && profile?.preferred_language === "bn" ? "bn" : "en",
                      },
                    });
                  }}
                >
                  <div className="grid gap-2"><Label>{t("calendar.cropLabel")}</Label>
                    <Input value={aiCrop} onChange={(e) => setAiCrop(e.target.value)} placeholder="e.g. Tomato" />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("calendar.plotOptional")}</Label>
                    <Select value={aiPlot} onValueChange={setAiPlot}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("calendar.noPlot")}</SelectItem>
                        {(plotsQ.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={aiMut.isPending}>
                      {aiMut.isPending ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t("calendar.generating")}</> : t("calendar.generate")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> {t("calendar.addTask")}</Button></DialogTrigger>
              <TaskDialog
                plots={plotsQ.data ?? []}
                submitting={create.isPending}
                onSubmit={(v) => create.mutate({ data: v })}
              />
            </Dialog>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {q.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          {q.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">{t("calendar.loadError")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>{t("common.retry")}</Button>
            </div>
          )}
          {q.data && q.data.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">{t("calendar.noTasks")}</p>
            </div>
          )}
          {q.data?.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle.mutate({ data: { id: task.id, status: task.status === "done" ? "pending" : "done" } })}
                >
                  {task.status === "done"
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <Circle className="h-5 w-5 text-muted-foreground" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</div>
                  <div className="text-xs text-muted-foreground">{t("calendar.due", { date: task.due_date })} · {task.source}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ data: { id: task.id } })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

function TaskDialog({
  plots,
  submitting,
  onSubmit,
}: {
  plots: { id: string; name: string }[];
  submitting: boolean;
  onSubmit: (v: { title: string; due_date: string; plot_id: string | null }) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [plot, setPlot] = useState<string>("none");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr(t("calendar.titleRequired"));
    if (!due) return setErr(t("calendar.dueRequired"));
    onSubmit({ title: title.trim(), due_date: due, plot_id: plot === "none" ? null : plot });
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{t("calendar.addTask")}</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-2"><Label>{t("calendar.taskTitle")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div className="grid gap-2"><Label>{t("calendar.dueDate")}</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="grid gap-2">
          <Label>{t("calendar.plotOptional")}</Label>
          <Select value={plot} onValueChange={setPlot}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("calendar.noPlot")}</SelectItem>
              {plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter><Button type="submit" disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
