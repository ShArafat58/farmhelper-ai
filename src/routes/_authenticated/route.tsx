import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import farmerBg from "@/assets/farmer-bg.jpg.asset.json";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-primary/15 via-background to-secondary/30">
      {/* Fixed watermark background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: `url("${farmerBg.url}")` }}
      />
      {/* Strong scrim so image is just a faint watermark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-background/88 backdrop-blur-[2px]"
      />
      <Outlet />
    </div>
  );
}
