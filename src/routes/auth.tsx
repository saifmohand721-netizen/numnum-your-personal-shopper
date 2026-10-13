import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import appIcon from "@/assets/numnum-app-icon.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable";

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

const REGIONS = [
  "المسيب",
  "المحاويل",
  "الإسكندرية / الحصوة",
  "الجبلة (المشروع)",
  "سدة الهندية",
  "أخرى (شمال بابل)",
] as const;

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
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
        // so it works even before the email is confirmed (no session yet).
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
        setMsg("تم إنشاء الحساب! افتح بريدك واضغط رابط التأكيد ثم سجّل الدخول.");
      }
    } finally { setBusy(false); }
  }

  async function google() {
    setMsg("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setMsg("تعذّر الدخول عبر Google. جرّب مرة ثانية.");
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
                        className={`relative flex min-h-20 flex-col items-start justify-between gap-2 rounded-xl border-2 p-3 text-start transition active:scale-[0.97] ${selected ? "border-primary bg-primary/10 shadow-md" : open ? "border-success/40 bg-background hover:border-primary/60" : "border-border bg-muted/40 text-muted-foreground"}`}>
                        <span className="text-sm font-bold leading-5">{r}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{open ? "متاحة الآن 🟢" : "قريباً ⏳"}</span>
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
