import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const dashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const head = { count: "exact" as const, head: true };
    const uid = context.userId;
    const since = new Date();
    since.setDate(since.getDate() - 13);
    const sinceIso = since.toISOString();
    const todayDate = new Date().toISOString().slice(0, 10);

    const [profile, badges, plots, tasksAll, listings, diagnoses, upcoming, recentTasks] =
      await Promise.all([
        context.supabase.from("profiles").select("krishi_score, full_name").eq("id", uid).maybeSingle(),
        context.supabase.from("badges").select("code, awarded_at").eq("user_id", uid).order("awarded_at", { ascending: false }),
        context.supabase.from("farm_plots").select("id", head).eq("user_id", uid),
        context.supabase.from("calendar_tasks").select("id, status").eq("user_id", uid),
        context.supabase.from("market_listings").select("id, status").eq("user_id", uid),
        context.supabase.from("diagnoses").select("id", head).eq("user_id", uid),
        context.supabase
          .from("calendar_tasks")
          .select("id, title, due_date, status")
          .eq("user_id", uid)
          .eq("status", "pending")
          .gte("due_date", todayDate)
          .order("due_date", { ascending: true })
          .limit(5),
        context.supabase
          .from("calendar_tasks")
          .select("id, status, created_at, due_date")
          .eq("user_id", uid)
          .gte("created_at", sinceIso),
      ]);

    // Build 14-day created-tasks series (proxy for activity over time)
    const days: { day: string; tasks: number; done: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), tasks: 0, done: 0 });
    }
    for (const t of (recentTasks.data ?? []) as any[]) {
      const key = (t.created_at as string).slice(5, 10);
      const day = days.find((d) => d.day === key);
      if (!day) continue;
      day.tasks += 1;
      if (t.status === "done") day.done += 1;
    }

    const listingsByStatus: Record<string, number> = { active: 0, sold: 0, removed: 0 };
    for (const l of (listings.data ?? []) as any[]) {
      if (l.status in listingsByStatus) listingsByStatus[l.status] += 1;
    }

    const tasksDone = ((tasksAll.data ?? []) as any[]).filter((t) => t.status === "done").length;
    const tasksPending = ((tasksAll.data ?? []) as any[]).filter((t) => t.status === "pending").length;

    return {
      score: profile.data?.krishi_score ?? 0,
      badges: (badges.data ?? []) as { code: string; awarded_at: string }[],
      counts: {
        plots: plots.count ?? 0,
        tasksDone,
        tasksPending,
        listingsActive: listingsByStatus.active,
        diagnoses: diagnoses.count ?? 0,
      },
      upcomingTasks: (upcoming.data ?? []) as { id: string; title: string; due_date: string | null; status: string }[],
      activitySeries: days,
      listingsByStatus,
    };
  });
