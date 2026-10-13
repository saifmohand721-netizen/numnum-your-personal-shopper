import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, LogOut, Package, RefreshCw, Search, ShoppingBag, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { getDriverOrders, updateDriverOrder } from "@/lib/orders.functions";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { getStatusLabel, getStatusTone, orderStages, sortOrdersForStaff, type OrderStatus } from "@/lib/order-status";
import { forgetDriverPin, getDriverId, readDriverPin, rememberDriverPin } from "@/lib/driver-storage";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "لوحة السائق — نم نم" },
      { name: "description", content: "لوحة إدارة وتتبع طلبات نم نم للسائقين." },
      { property: "og:title", content: "لوحة السائق — نم نم" },
      { property: "og:description", content: "إدارة طلبات الشراء والتوصيل النشطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DriverPage,
});

type Order = Tables<"orders">;
let cachedDriverId = "";
function driverId() { if (!cachedDriverId) cachedDriverId = getDriverId(window.localStorage); return cachedDriverId; }
const filters = [["all", "الكل"], ...orderStages.map((stage) => [stage.status, stage.label] as const)];

function DriverPage() {
  const [pin, setPin] = useState("");
  const [activePin, setActivePin] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  function logout() {
    try { forgetDriverPin(window.localStorage); } catch { /* storage unavailable */ }
    setActivePin(""); setPin(""); setOrders([]); setError("");
  }

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let saved = "";
      try { saved = readDriverPin(window.localStorage); } catch { /* storage unavailable */ }
      if (!saved) { setRestoring(false); return; }
      try {
        const data = await getDriverOrders({ data: { pin: saved, driverId: driverId() } });
        if (!cancelled) { setOrders(data); setActivePin(saved); setError(""); }
      } catch {
        if (!cancelled) setError("تعذّر استعادة الدخول. أدخل رمزك للمحاولة مجدداً.");
      } finally { if (!cancelled) setRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  async function refresh(pinValue = activePin) {
    if (!pinValue) return;
    try {
      const data = await getDriverOrders({ data: { pin: pinValue, driverId: driverId() } });
      setOrders(data);
      setError("");
    } catch { setError("تعذّر تحديث الطلبات. جرّب مرة ثانية."); }
  }

  async function unlock(event: FormEvent) {
    event.preventDefault(); setLoading(true);
    try {
      const data = await getDriverOrders({ data: { pin, driverId: driverId() } });
      try { rememberDriverPin(window.localStorage, pin); } catch { /* storage unavailable */ }
      setOrders(data); setActivePin(pin); setError("");
    }
    catch { setError("رمز الدخول غير صحيح."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!activePin) return <main dir="rtl" className="min-h-screen bg-foreground pb-28 text-background">
    <div className="fixed inset-0 z-40 grid place-items-center bg-foreground/80 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="driver-login-title">
      <section className="w-full max-w-sm animate-float-in rounded-3xl border border-background/10 bg-foreground p-7 shadow-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground"><Truck /></div>
        <h1 id="driver-login-title" className="mt-5 text-center text-2xl font-black">دخول لوحة السائق</h1>
        <p className="mt-2 text-center text-sm text-background/60">أدخل رمزك الخاص مرة وحدة، وراح نتذكرك بعدين</p>
        <form onSubmit={unlock} className="mt-6"><label className="sr-only" htmlFor="pin">رمز السائق</label><input id="pin" type="password" inputMode="numeric" autoComplete="one-time-code" autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full rounded-2xl border border-background/15 bg-background/5 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-primary" placeholder="••••••" />{error && <p role="alert" className="mt-3 text-center text-sm font-bold text-primary">{error}</p>}<Button variant="hero" size="xl" className="mt-5 w-full" disabled={loading || pin.length === 0}>{loading ? "جاري التحقق..." : "دخول اللوحة"}</Button><Button variant="ghost" className="mt-2 w-full text-background/70 hover:bg-background/10 hover:text-background" asChild><Link to="/">العودة للرئيسية</Link></Button></form>
      </section>
    </div>
    <BottomNav active="driver" dark />
  </main>;

  const sorted = sortOrdersForStaff(orders);
  const shown = filter === "all" ? sorted : sorted.filter((order) => order.status === filter);
  return <main dir="rtl" className="min-h-screen bg-foreground pb-28 text-background">
    <header className="border-b border-background/10 px-4 py-4 sm:px-6"><div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Truck /></span><div className="min-w-0"><h1 className="truncate text-xl font-black">لوحة السائق</h1><p className="truncate text-xs text-background/50">تتحدّث فور وصول أي تغيير</p></div></div><div className="flex shrink-0"><Button variant="ghost" size="icon" title="تحديث" aria-label="تحديث" onClick={() => void refresh()} className="text-background hover:bg-background/10"><RefreshCw /></Button><Button variant="ghost" size="icon" title="خروج" aria-label="خروج" onClick={logout} className="text-background hover:bg-background/10"><LogOut /></Button></div></div></header>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={<Package />} label="الطلبات النشطة" value={orders.filter((o) => o.status !== "completed").length} /><Stat icon={<ShoppingBag />} label="قيد الشراء" value={orders.filter((o) => o.status === "buying").length} /><Stat icon={<Truck />} label="في الطريق" value={orders.filter((o) => o.status === "delivering").length} /><Stat icon={<Check />} label="مكتملة" value={orders.filter((o) => o.status === "completed").length} /></div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{filters.map(([id,label]) => <Button key={id} variant={filter === id ? "hero" : "outline"} size="sm" className={filter === id ? "" : "border-background/15 bg-transparent text-background hover:bg-background/10 hover:text-background"} onClick={() => setFilter(id)}>{label}<span className="opacity-60">{id === "all" ? orders.length : orders.filter((o) => o.status === id).length}</span></Button>)}</div>
      {error && <p role="alert" className="mt-3 text-sm text-primary">{error}</p>}
      {shown.length === 0 ? <div className="mt-12 text-center text-background/50"><Search className="mx-auto size-10" /><p className="mt-3 font-bold">ماكو طلبات ضمن هذا التصنيف</p></div> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{shown.map((order) => <OrderCard key={`${order.id}-${order.status}-${order.purchase_price}-${order.delivery_fee}`} order={order} pin={activePin} onSaved={() => refresh()} />)}</div>}
    </div>
    <BottomNav active="driver" dark />
  </main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-xl border border-background/10 bg-background/5 p-4"><span className="text-primary">{icon}</span><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs text-background/50">{label}</p></div>; }

function OrderCard({ order, pin, onSaved }: { order: Order; pin: string; onSaved: () => void }) {
  const [status, setStatus] = useState(order.status);
  const [purchase, setPurchase] = useState(String(order.purchase_price || ""));
  const [fee, setFee] = useState(String(order.delivery_fee || ""));
  const [saving, setSaving] = useState(false);
  const total = Number(purchase || 0) + Number(fee || 0);
  const [saveError, setSaveError] = useState("");
  async function save(nextStatus = status) { setSaving(true); setSaveError(""); try { await updateDriverOrder({ data: { pin, driverId: driverId(), id: order.id, status: nextStatus as OrderStatus, purchasePrice: Number(purchase || 0), deliveryFee: Number(fee || 0) } }); onSaved(); } catch (e) { const m = e instanceof Error ? e.message : ""; setSaveError(m.includes("سائق آخر") ? "هذا الطلب استلمه سائق آخر." : "تعذّر حفظ التحديث. جرّب مرة ثانية."); if (m.includes("سائق آخر")) onSaved(); } finally { setSaving(false); } }
  const tone = getStatusTone(order.status);
  return <article className="relative overflow-hidden rounded-2xl border border-background/10 bg-background/5 p-5 ps-6 shadow-xl"><span aria-hidden className={`absolute inset-y-0 start-0 w-1.5 ${tone.bar}`} /><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs text-background/45">#{order.id.slice(0,8).toUpperCase()} · {new Date(order.created_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}</p><h2 className="mt-1 truncate text-lg font-black">{order.store_type}</h2></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${tone.badge}`}>{getStatusLabel(order.status)}</span></div>
    {order.status === "pending" && <Button variant="hero" size="lg" className="mt-4 w-full rounded-xl" disabled={saving} onClick={() => void save("buying")}><ShoppingBag />قيد التجهيز — استلم الطلب</Button>}<p className="mt-4 whitespace-pre-wrap rounded-xl bg-foreground/60 p-4 text-sm leading-6">{order.items_list}</p>{order.voice_note_url && <div className="mt-3"><p className="mb-1 text-xs font-bold text-background/55">ملاحظة صوتية من الزبون</p><audio controls preload="none" src={order.voice_note_url} className="w-full" /></div>}<p className="mt-3 text-sm text-background/65">{order.delivery_address}</p><p dir="ltr" className="mt-1 text-right text-sm font-bold">{order.customer_phone}</p>
    <div className="mt-5 grid grid-cols-2 gap-3"><MoneyInput label="سعر المشتريات" value={purchase} setValue={setPurchase} /><MoneyInput label="أجرة التوصيل" value={fee} setValue={setFee} /></div><div className="mt-3 flex items-center justify-between rounded-xl bg-success/15 px-4 py-3"><span className="text-sm font-bold text-success">المجموع للزبون</span><strong>{total.toLocaleString("ar-IQ")} د.ع</strong></div>
    <label className="mt-4 block text-xs font-bold text-background/55">حالة الطلب</label><select aria-label="حالة الطلب" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-background/15 bg-foreground px-4 py-3 outline-none focus:border-primary">{orderStages.map((stage) => <option key={stage.status} value={stage.status}>{stage.label}</option>)}</select>{saveError && <p role="alert" className="mt-2 text-sm text-primary">{saveError}</p>}<Button variant="emerald" size="lg" className="mt-4 w-full rounded-xl" disabled={saving} onClick={() => void save()}>{saving ? "جاري الحفظ..." : "حفظ وتحديث الزبون"}</Button>
  </article>;
}

function MoneyInput({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) { return <label className="text-xs font-bold text-background/55">{label}<span className="mt-2 flex items-center rounded-xl border border-background/15 bg-foreground px-3"><input dir="ltr" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} className="min-w-0 flex-1 bg-transparent py-3 text-background outline-none" /><span>د.ع</span></span></label>; }