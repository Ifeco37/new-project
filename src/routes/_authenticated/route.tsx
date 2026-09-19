/**
 * Route guard: every page under /_authenticated requires a signed-in admin.
 * Unauthenticated visitors are sent back to the login page.
 */
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
