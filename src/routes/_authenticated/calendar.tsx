import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
      toast.success(`Added ${r.inserted} AI tasks`);
      setAiOpen(false); setAiCrop("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: createFn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task added"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: toggleFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: delFn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track farm tasks by due date.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Add task</Button></DialogTrigger>
            <TaskDialog
              plots={plotsQ.data ?? []}
              submitting={create.isPending}
              onSubmit={(v) => create.mutate({ data: v })}
            />
          </Dialog>
        </div>

        <div className="mt-6 space-y-3">
          {q.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          {q.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">Could not load tasks.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => q.refetch()}>Retry</Button>
            </div>
          )}
          {q.data && q.data.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No tasks yet — add your first.</p>
            </div>
          )}
          {q.data?.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle.mutate({ data: { id: t.id, status: t.status === "done" ? "pending" : "done" } })}
                >
                  {t.status === "done"
                    ? <CheckCircle2 className="h-5 w-5 text-primary" />
                    : <Circle className="h-5 w-5 text-muted-foreground" />}
                </Button>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">Due {t.due_date} · {t.source}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate({ data: { id: t.id } })}>
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
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [plot, setPlot] = useState<string>("none");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    if (!due) return setErr("Due date is required.");
    onSubmit({ title: title.trim(), due_date: due, plot_id: plot === "none" ? null : plot });
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add task</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
        <div className="grid gap-2"><Label>Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="grid gap-2">
          <Label>Plot (optional)</Label>
          <Select value={plot} onValueChange={setPlot}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter><Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
