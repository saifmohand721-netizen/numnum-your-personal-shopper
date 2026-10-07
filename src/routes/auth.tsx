import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import appIcon from "@/assets/numnum-app-icon.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — نم نم" },
      { name: "description", content: "سجّل دخولك إلى نم نم لطلب ومتابعة طلباتك بأمان." },
      { property: "og:title", content: "تسجيل الدخول — نم نم" },
      { property: "og:description", content: "حسابك الخاص لطلبات الشراء والتوصيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/", replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(""); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg("البريد أو كلمة السر غير صحيحة.");
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        setMsg(error ? "تعذّر إنشاء الحساب. تأكد من البريد وأن كلمة السر 6 أحرف على الأقل." : "تم إنشاء الحساب! افتح بريدك واضغط رابط التأكيد ثم سجّل الدخول.");
      }
    } finally { setBusy(false); }
  }

  async function google() {
    setMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMsg("تعذّر الدخول عبر Google. جرّب مرة ثانية.");
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md animate-float-in rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" width={56} height={56} className="size-14 rounded-xl shadow-sm" />
          <div><h1 className="text-2xl font-black text-primary">نم نم</h1><p className="text-sm text-muted-foreground">{mode === "in" ? "أهلاً بعودتك! سجّل دخولك" : "أنشئ حسابك الخاص"}</p></div>
        </div>
        <Button type="button" variant="outline" size="lg" className="mt-7 w-full rounded-xl" onClick={() => void google()}>المتابعة باستخدام Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />أو<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-4">
          <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          <input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
          {msg && <p role="alert" className="rounded-xl bg-muted px-4 py-3 text-sm font-bold">{msg}</p>}
          <Button variant="hero" size="xl" className="w-full" disabled={busy}>{busy ? "لحظة..." : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</Button>
        </form>
        <button type="button" className="mt-5 w-full text-sm font-bold text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
          {mode === "in" ? "ما عندك حساب؟ أنشئ حساب جديد" : "عندك حساب؟ سجّل دخولك"}
        </button>
      </div>
    </main>
  );
}
