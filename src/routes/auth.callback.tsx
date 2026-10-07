import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "جاري تسجيل الدخول — نم نم" },
      { name: "description", content: "إكمال تسجيل الدخول إلى نم نم." },
      { property: "og:title", content: "جاري تسجيل الدخول — نم نم" },
      { property: "og:description", content: "إكمال تسجيل الدخول إلى نم نم." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

// Public landing page for Google OAuth. Handles both PKCE (?code=) and
// implicit (#access_token=) returns, then sends the user to the app home.
function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (ok) navigate({ to: "/", replace: true });
      else setFailed(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) finish(true);
    });

    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const err = url.searchParams.get("error_description") || hash.get("error_description");
      if (err) return finish(false);

      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // The client may already have exchanged it automatically.
          const { data } = await supabase.auth.getSession();
          return finish(!!data.session);
        }
        return finish(true);
      }

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        return finish(!error);
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) return finish(true);
      window.setTimeout(async () => {
        const { data: late } = await supabase.auth.getSession();
        finish(!!late.session);
      }, 3000);
    })();

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-background px-4">
      <div className="text-center">
        {failed ? (
          <>
            <p className="font-bold">تعذّر إكمال تسجيل الدخول.</p>
            <button type="button" className="mt-4 font-bold text-primary" onClick={() => navigate({ to: "/auth", replace: true })}>
              رجوع لصفحة الدخول
            </button>
          </>
        ) : (
          <p className="font-bold text-muted-foreground">جاري تسجيل الدخول...</p>
        )}
      </div>
    </main>
  );
}
