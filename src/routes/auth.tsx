import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import appIcon from "@/assets/diz-app-icon.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "up" ? ("up" as const) : ("in" as const),
  }),
  head: () => ({
    meta: [
      { title: "حساب الزبون — دز" },
      { name: "description", content: "أنشئ حسابك في دز واطلب أي شيء يوصل لباب بيتك." },
      { property: "og:title", content: "حساب الزبون — دز" },
      { property: "og:description", content: "حسابك الخاص لطلبات الشراء والتوصيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const REGIONS = [
  "المسيب",
  "المحاويل",
  "الإسكندرية / الحصوة",
  "الجبلة (المشروع)",
  "سدة الهندية",
  "أخرى (شمال بابل)",
] as const;

const inputCls =
  "w-full rounded-xl border border-background/15 bg-background/5 px-4 py-3 outline-none placeholder:text-background/35 focus:border-primary focus:ring-4 focus:ring-primary/15";

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/home", replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/home", replace: true });
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
        if (region !== "المسيب") {
          setMsg(region ? "ستتوفر الخدمة قريباً في منطقتك 🛵✨" : "اختر منطقتك أولاً.");
          return;
        }
        const name = fullName.trim();
        const user = username.trim().toLowerCase();
        const phoneDigits = phone.replace(/\D/g, "");
        if (name.length < 2 || name.length > 100) { setMsg("اكتب اسمك الكامل."); return; }
        if (!/^[a-z0-9_]{3,30}$/.test(user)) { setMsg("اسم المستخدم: 3 أحرف على الأقل، إنجليزي أو أرقام بدون فراغات."); return; }
        if (phoneDigits.length < 10 || phoneDigits.length > 15) { setMsg("اكتب رقم هاتف صحيح."); return; }

        const { data: free, error: checkError } = await supabase.rpc("username_available", { _username: user });
        if (checkError) console.error("[signup] username check failed:", checkError);
        if (free === false) { setMsg("اسم المستخدم هذا محجوز، اختر غيره."); return; }

        // The profile row is created by a database trigger from this metadata,
        // and email auto-confirm signs the customer in immediately — no
        // confirmation step, the account is ready to order right away.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { region, full_name: name, username: user, phone: phoneDigits } },
        });
        if (error) {
          console.error("[signup] failed:", error);
          setMsg(error.message.includes("ستتوفر الخدمة") ? "ستتوفر الخدمة قريباً في منطقتك" : `تعذّر إنشاء الحساب: ${error.message}`);
          return;
        }
        if (!data.user) { setMsg("تعذّر إنشاء الحساب. جرّب مرة ثانية."); return; }
        if (data.session) { navigate({ to: "/home", replace: true }); return; }
        // Fallback: if no session came back, sign in directly.
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) { setMsg("تم إنشاء الحساب! سجّل دخولك الآن."); setMode("in"); return; }
        navigate({ to: "/home", replace: true });
      }
    } finally { setBusy(false); }
  }

  async function google() {
    setMsg("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setMsg("تعذّر الدخول عبر Google. جرّب مرة ثانية.");
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-foreground px-4 py-10 text-background">
      <div className="w-full max-w-md animate-float-in rounded-2xl border border-background/10 bg-foreground p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" width={56} height={56} className="size-14 rounded-xl shadow-lg" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">حساب الزبون <ShoppingBag className="size-6 text-primary" /></h1>
            <p className="text-sm text-background/55">{mode === "in" ? "أهلاً بعودتك! سجّل دخولك" : "أنشئ حسابك واطلب أي شيء"}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="lg" className="mt-7 w-full rounded-xl border-background/15 bg-transparent text-background hover:bg-background/10 hover:text-background" onClick={() => void google()}>المتابعة باستخدام Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-background/45"><span className="h-px flex-1 bg-background/15" />أو<span className="h-px flex-1 bg-background/15" /></div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <>
              <input type="text" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" className={inputCls} />
              <input dir="ltr" type="text" required minLength={3} maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className={inputCls} />
              <input dir="ltr" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXXX" className={inputCls} />
              <fieldset>
                <legend className="mb-2 text-sm font-bold">اختر منطقتك — شمال بابل</legend>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {REGIONS.map((r) => {
                    const open = r === "المسيب";
                    const selected = region === r;
                    return (
                      <button key={r} type="button" role="radio" aria-checked={selected}
                        onClick={() => {
                          if (open) { setRegion(r); setMsg(""); return; }
                          setRegion("");
                          toast("ستتوفر الخدمة قريباً في منطقتك 🛵✨", { description: `نشتغل على الوصول إلى ${r} قريباً.` });
                        }}
                        className={`relative flex min-h-20 flex-col items-start justify-between gap-2 rounded-xl border-2 p-3 text-start transition active:scale-[0.97] ${selected ? "border-primary bg-primary/15 shadow-md" : open ? "border-success/40 bg-background/5 hover:border-primary/60" : "border-background/10 bg-background/5 text-background/45"}`}>
                        <span className="text-sm font-bold leading-5">{r}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${open ? "bg-success/15 text-success" : "bg-background/10 text-background/45"}`}>{open ? "متاحة الآن 🟢" : "قريباً ⏳"}</span>
                        {selected && <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" /></span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}
          <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputCls} />
          <input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className={inputCls} />
          {msg && <p role="alert" className="rounded-xl bg-background/5 px-4 py-3 text-sm font-bold text-primary">{msg}</p>}
          <Button variant="hero" size="xl" className="w-full" disabled={busy}>{busy ? "لحظة..." : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</Button>
        </form>
        <button type="button" className="mt-5 w-full text-sm font-bold text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
          {mode === "in" ? "ما عندك حساب؟ أنشئ حساب جديد" : "عندك حساب؟ سجّل دخولك"}
        </button>
        <Button variant="ghost" className="mt-2 w-full text-background/60 hover:bg-background/10 hover:text-background" asChild>
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </main>
  );
}
