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

    const [profile, badges, plots, tasksAll, listings, diagnoses, upcoming, recentTasks] =
      await Promise.all([
        context.supabase.from("profiles").select("krishi_score, full_name").eq("id", uid).maybeSingle(),
        context.supabase.from("badges").select("code, awarded_at").eq("user_id", uid).order("awarded_at", { ascending: false }),
        context.supabase.from("farm_plots").select("id", head).eq("user_id", uid),
        context.supabase.from("calendar_tasks").select("id, status", { count: "exact" }).eq("user_id", uid),
        context.supabase.from("market_listings").select("id, status").eq("user_id", uid),
        context.supabase.from("diagnoses").select("id", head).eq("user_id", uid),
        context.supabase
          .from("calendar_tasks")
          .select("id, title, due_at, status")
          .eq("user_id", uid)
          .eq("status", "pending")
          .gte("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(5),
        context.supabase
          .from("calendar_tasks")
          .select("id, status, updated_at, due_at")
          .eq("user_id", uid)
          .gte("updated_at", sinceIso),
      ]);

    // Build 14-day completed-tasks series
    const days: { day: string; completed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), completed: 0 });
    }
    for (const t of recentTasks.data ?? []) {
      if (t.status !== "done") continue;
      const key = (t.updated_at as string).slice(5, 10);
      const day = days.find((d) => d.day === key);
      if (day) day.completed += 1;
    }

    const listingsByStatus = { active: 0, sold: 0, removed: 0 };
    for (const l of listings.data ?? []) {
      if (l.status in listingsByStatus) (listingsByStatus as any)[l.status] += 1;
    }

    const tasksDone = (tasksAll.data ?? []).filter((t: any) => t.status === "done").length;
    const tasksPending = (tasksAll.data ?? []).filter((t: any) => t.status === "pending").length;

    return {
      score: profile.data?.krishi_score ?? 0,
      badges: badges.data ?? [],
      counts: {
        plots: plots.count ?? 0,
        tasksDone,
        tasksPending,
        listingsActive: listingsByStatus.active,
        diagnoses: diagnoses.count ?? 0,
      },
      upcomingTasks: upcoming.data ?? [],
      completedSeries: days,
      listingsByStatus,
    };
  });
