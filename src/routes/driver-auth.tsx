import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Truck } from "lucide-react";

import appIcon from "@/assets/diz-app-icon.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/driver-auth")({
  head: () => ({
    meta: [
      { title: "بوابة السائقين — دز" },
      { name: "description", content: "سجّل كسائق مع دز أو ادخل لحسابك لاستلام الطلبات." },
      { property: "og:title", content: "بوابة السائقين — دز" },
      { property: "og:description", content: "انضم لفريق توصيل دز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverAuth,
});

const inputCls =
  "w-full rounded-xl border border-background/15 bg-background/5 px-4 py-3 outline-none placeholder:text-background/35 focus:border-primary focus:ring-4 focus:ring-primary/15";

function DriverAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/driver", replace: true }); });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(""); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setMsg("البريد أو كلمة السر غير صحيحة."); return; }
        navigate({ to: "/driver", replace: true });
        return;
      }
      const name = fullName.trim();
      const phoneDigits = phone.replace(/\D/g, "");
      if (name.length < 2 || name.length > 100) { setMsg("اكتب اسمك الكامل."); return; }
      if (phoneDigits.length < 10 || phoneDigits.length > 15) { setMsg("اكتب رقم هاتف صحيح."); return; }

      // No OTP/email confirmation: signup signs the driver in immediately and
      // the profile trigger marks the account as a driver pending activation.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "driver", full_name: name, phone: phoneDigits } },
      });
      if (error) {
        console.error("[driver-signup] failed:", error);
        setMsg(`تعذّر إنشاء الحساب: ${error.message}`);
        return;
      }
      if (data.session) { navigate({ to: "/driver", replace: true }); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setMsg("تم إنشاء الحساب! سجّل دخولك الآن."); setMode("in"); return; }
      navigate({ to: "/driver", replace: true });
    } finally { setBusy(false); }
  }

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-foreground px-4 py-10 text-background">
      <div className="w-full max-w-md animate-float-in rounded-2xl border border-background/10 bg-foreground p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" width={56} height={56} className="size-14 rounded-xl shadow-lg" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black">بوابة السائقين <Truck className="size-6 text-primary" /></h1>
            <p className="text-sm text-background/55">{mode === "in" ? "أهلاً بعودتك! سجّل دخولك" : "سجّل كسائق وابدأ الربح مع دز"}</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "up" && (
            <>
              <input type="text" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" className={inputCls} />
              <input dir="ltr" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXXX" className={inputCls} />
            </>
          )}
          <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputCls} />
          <input dir="ltr" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className={inputCls} />
          {msg && <p role="alert" className="rounded-xl bg-background/5 px-4 py-3 text-sm font-bold text-primary">{msg}</p>}
          <Button variant="hero" size="xl" className="w-full" disabled={busy}>{busy ? "لحظة..." : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب سائق"}</Button>
        </form>
        <button type="button" className="mt-5 w-full text-sm font-bold text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
          {mode === "in" ? "ما عندك حساب سائق؟ سجّل الآن" : "عندك حساب؟ سجّل دخولك"}
        </button>
        <Button variant="ghost" className="mt-2 w-full text-background/60 hover:bg-background/10 hover:text-background" asChild>
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </main>
  );
}
