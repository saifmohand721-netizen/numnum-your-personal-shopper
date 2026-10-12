import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Ban, Lock, LogOut, Package, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOwnerOverview, setUserBanned } from "@/lib/owner.functions";
import { getStatusLabel } from "@/lib/order-status";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "لوحة المالك — نم نم" },
      { name: "description", content: "لوحة خاصة بمالك نم نم." },
      { property: "og:title", content: "لوحة المالك — نم نم" },
      { property: "og:description", content: "لوحة خاصة بمالك نم نم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OwnerPage,
});

type Overview = Awaited<ReturnType<typeof getOwnerOverview>>;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" }) : "—");
const money = (n: number | null) => `${Number(n ?? 0).toLocaleString("ar-IQ")} د.ع`;

function OwnerPage() {
  const [password, setPassword] = useState("");
  const [active, setActive] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<"orders" | "users">("orders");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(pw: string) {
    setBusy(true);
    try {
      const res = await getOwnerOverview({ data: { password: pw } });
      setData(res); setActive(pw); setError("");
    } catch {
      setError("كلمة السر غير صحيحة."); setActive(""); setData(null);
    } finally { setBusy(false); }
  }

  async function toggleBan(userId: string, banned: boolean) {
    setBusy(true);
    try {
      await setUserBanned({ data: { password: active, userId, banned } });
      await load(active);
    } catch {
      setError("تعذّر تنفيذ العملية. جرّب ثانية.");
    } finally { setBusy(false); }
  }

  const emailById = useMemo(() => new Map((data?.users ?? []).map((u) => [u.id, u.email ?? u.phone ?? "—"])), [data]);
  const term = q.trim().toLowerCase();
  const orders = (data?.orders ?? []).filter((o) => !term || [o.customer_phone, o.items_list, o.delivery_address, o.store_type, emailById.get(o.user_id ?? "")].some((v) => String(v ?? "").toLowerCase().includes(term)));
  const users = (data?.users ?? []).filter((u) => !term || [u.email, u.phone].some((v) => String(v ?? "").toLowerCase().includes(term)));
  const ordersByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of data?.orders ?? []) if (o.user_id) m.set(o.user_id, (m.get(o.user_id) ?? 0) + 1);
    return m;
  }, [data]);

  if (!active || !data) {
    return (
      <main dir="rtl" className="app-screen grid place-items-center bg-foreground px-5 text-background">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void load(password); }} className="w-full max-w-sm animate-float-in rounded-3xl border border-background/10 bg-foreground p-7 shadow-xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Lock /></div>
          <h1 className="mt-4 text-center text-2xl font-black">لوحة المالك</h1>
          <p className="mt-1 text-center text-sm text-background/60">أدخل كلمة السر للمتابعة</p>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className="mt-6 w-full rounded-xl border border-background/15 bg-background/5 px-4 py-3 text-center outline-none focus:border-primary" />
          {error && <p role="alert" className="mt-3 text-center text-sm font-bold text-destructive">{error}</p>}
          <Button variant="hero" size="xl" className="mt-5 w-full" disabled={busy || !password}>{busy ? "لحظة..." : "دخول"}</Button>
        </form>
      </main>
    );
  }

  const revenue = data.orders.reduce((s, o) => s + Number(o.delivery_fee ?? 0), 0);

  return (
    <main dir="rtl" className="app-screen bg-background pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate text-xl font-black text-primary">لوحة المالك</h1>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" aria-label="تحديث" onClick={() => void load(active)} disabled={busy}><RefreshCw className={busy ? "animate-spin" : ""} /></Button>
            <Button variant="ghost" size="icon" aria-label="خروج" onClick={() => { setActive(""); setData(null); setPassword(""); }}><LogOut /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {[["الحسابات", data.users.length], ["الطلبات", data.orders.length], ["أجور التوصيل", money(revenue)]].map(([l, v]) => (
            <div key={String(l)} className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 truncate text-lg font-black">{v}</p></div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          <button type="button" onClick={() => setTab("orders")} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold ${tab === "orders" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><Package className="size-4" />الطلبات</button>
          <button type="button" onClick={() => setTab("users")} className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold ${tab === "users" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}><Users className="size-4" />الحسابات</button>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-input bg-card px-3"><Search className="size-4 shrink-0 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد أو الهاتف أو العنوان" className="w-full bg-transparent py-3 outline-none" /></label>

        {tab === "orders" ? (
          orders.length === 0 ? <p className="py-10 text-center text-muted-foreground">لا توجد طلبات.</p> :
          orders.map((o) => (
            <article key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0"><p className="truncate font-black">{o.store_type}</p><p className="text-xs text-muted-foreground">{fmt(o.created_at)}</p></div>
                <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{getStatusLabel(o.status)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm leading-6">{o.items_list}</p>
              {o.voice_note_url && <audio controls preload="none" src={o.voice_note_url} className="mt-3 w-full" />}
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">الحساب</dt><dd className="truncate" dir="ltr">{emailById.get(o.user_id ?? "") ?? "—"}</dd>
                <dt className="text-muted-foreground">الهاتف</dt><dd dir="ltr" className="text-right font-bold">{o.customer_phone}</dd>
                <dt className="text-muted-foreground">العنوان</dt><dd className="break-words">{o.delivery_address}</dd>
                <dt className="text-muted-foreground">سقف الميزانية</dt><dd>{o.budget_limit ? money(o.budget_limit) : "—"}</dd>
                <dt className="text-muted-foreground">المشتريات</dt><dd>{money(o.purchase_price)}</dd>
                <dt className="text-muted-foreground">التوصيل</dt><dd>{money(o.delivery_fee)}</dd>
                <dt className="font-bold">المجموع</dt><dd className="font-black text-primary">{money(o.total_price)}</dd>
              </dl>
            </article>
          ))
        ) : (
          users.length === 0 ? <p className="py-10 text-center text-muted-foreground">لا توجد حسابات.</p> :
          users.map((u) => (
            <article key={u.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p dir="ltr" className="truncate text-right font-bold">{u.email ?? u.phone ?? "—"}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {u.banned && <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">محظور</span>}
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{u.provider === "google" ? "Google" : "بريد"}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <p>التسجيل<br /><span className="text-foreground">{fmt(u.created_at)}</span></p>
                <p>آخر دخول<br /><span className="text-foreground">{fmt(u.last_sign_in_at)}</span></p>
                <p>الطلبات<br /><span className="font-black text-primary">{ordersByUser.get(u.id) ?? 0}</span></p>
              </div>
              <Button
                variant={u.banned ? "outline" : "destructive"}
                size="sm"
                className="mt-3 w-full"
                disabled={busy}
                onClick={() => void toggleBan(u.id, !u.banned)}
              >
                {u.banned ? <><ShieldCheck className="size-4" />فك الحظر</> : <><Ban className="size-4" />حظر الحساب</>}
              </Button>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
