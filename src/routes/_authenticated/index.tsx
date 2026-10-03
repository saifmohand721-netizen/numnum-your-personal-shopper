import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Hammer,
  LogOut,
  MapPin,
  Mic,
  Package,
  Pill,
  ShoppingBasket,
  X,
} from "lucide-react";

import appIcon from "@/assets/numnum-app-icon.png";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { createOrder, listMyOrders, trackOrder } from "@/lib/orders.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "نم نم — نشتري ونوصل لك أي شيء" },
      { name: "description", content: "اطلب أغراضك من أي متجر، ونم نم يشتريها ويوصلها لباب بيتك." },
      { property: "og:title", content: "نم نم — نشتري ونوصل لك أي شيء" },
      { property: "og:description", content: "خدمة شراء وتوصيل شخصية سريعة وموثوقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { tab?: "home" | "orders" } =>
    search["tab"] === "orders" ? { tab: "orders" } : {},
  component: Index,
});

const categories = [
  { id: "grocery", name: "البقالة والسوبرماركت", note: "مقاضي البيت اليومية", icon: ShoppingBasket },
  { id: "hardware", name: "الإنشائية والعدد", note: "مواد وأدوات بسرعة", icon: Hammer },
  { id: "pharmacy", name: "الصيدلية والمستلزمات", note: "احتياجاتك الصحية", icon: Pill },
  { id: "custom", name: "طلب خاص", note: "أي شيء آخر تحتاجه", icon: Package },
];

const progress = [
  ["pending", "تم استلام الطلب", "طلبك صار عندنا"],
  ["buying", "جاري الشراء من المتجر", "مندوبنا يجمع أغراضك"],
  ["delivering", "نم نم في الطريق إليك", "جهّز نفسك للاستلام"],
  ["completed", "تم التسليم بنجاح", "بالعافية عليك!"],
] as const;

type TrackedOrder = Awaited<ReturnType<typeof trackOrder>>;

function Index() {
  const tab = Route.useSearch().tab ?? "home";
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("grocery");
  const [items, setItems] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [voicePath, setVoicePath] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState<TrackedOrder>(null);
  const [myOrders, setMyOrders] = useState<NonNullable<TrackedOrder>[]>([]);
  const [dismissInstall, setDismissInstall] = useState(false);
  const deferredInstall = useRef<(Event & { prompt: () => Promise<void> }) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      deferredInstall.current = event as Event & { prompt: () => Promise<void> };
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    void listMyOrders().then(setMyOrders).catch(() => {});
  }, [tracked?.id, tracked?.status]);

  useEffect(() => {
    if (!tracked) return;
    const orderId = tracked.id;
    const refresh = async () => {
      try {
        const latest = await trackOrder({ data: { id: orderId } });
        if (latest) setTracked(latest);
      } catch {
        /* keep last known state */
      }
    };
    // Realtime limited to this single order; RLS only delivers rows the signed-in owner can read.
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => void refresh(),
      )
      .subscribe();
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [tracked?.id]);

  function resizeItems() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!items.trim() || !address.trim() || phone.replace(/\D/g, "").length < 9) {
      setError("كمّل قائمة الأغراض والعنوان ورقم الهاتف حتى نرسل طلبك.");
      return;
    }
    setSending(true);
    try {
      const data = await createOrder({ data: {
        phone: `+964${phone.replace(/\D/g, "").replace(/^0/, "")}`,
        storeType: categories.find((item) => item.id === category)?.name ?? category,
        itemsList: items.trim(),
        deliveryAddress: address.trim(),
        budgetLimit: budget ? Number(budget.replace(/\D/g, "")) : null,
        voiceNotePath: voicePath,
      } });
      setSheetOpen(false); setItems(""); setVoicePath(null); setStep(1);
      setTracked(data);
    } catch {
      setError("تعذّر إرسال الطلب الآن. جرّب مرة ثانية بعد لحظات.");
    } finally {
      setSending(false);
    }
  }

  const current = tracked ? Math.max(0, progress.findIndex(([status]) => status === tracked.status)) : 0;
  const activeOrders = myOrders.filter((o) => o.status !== "completed");
  const activeOrder = activeOrders[0] ?? null;
  const pastOrders = myOrders.filter((o) => o.status === "completed");
  const selected = categories.find((c) => c.id === category)!;

  function openOrder(id: string) {
    setCategory(id); setStep(1); setError(""); setSheetOpen(true);
  }
  function selectTab(next: "home" | "orders") {
    void navigate({ to: "/", search: { tab: next }, replace: true });
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-28">
      {!dismissInstall && <div className="border-b border-primary/15 bg-surface-warm px-4 py-2.5">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="min-w-0 text-xs font-medium text-foreground">لطلب أسرع وتجربة أفضل، ثبّت نم نم على شاشتك الرئيسية</p>
          <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="sm" className="text-primary" onClick={() => void deferredInstall.current?.prompt()}>تثبيت</Button><Button variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setDismissInstall(true)}><X /></Button></div>
        </div>
      </div>}

      <div className="mx-auto max-w-2xl px-4">
        <BrandHeader />

        {tab === "home" ? <div className="animate-float-in space-y-6 pt-2">
          <button type="button" onClick={() => openOrder(category)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-right shadow-sm transition hover:shadow-xl">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">توصيل إلى</span><span className="block truncate font-extrabold">{address || "منزلك / المنطقة الحالية"}</span></span>
            <ChevronLeft className="shrink-0 text-muted-foreground" />
          </button>

          <section className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-xl">
            <div className="relative z-10 max-w-[65%]">
              <p className="text-xs font-bold opacity-85">متوفر الآن لخدمتك</p>
              <h1 className="mt-2 text-2xl font-black leading-snug">نشتري لك كلشي ونوصله لباب بيتك!</h1>
            </div>
            <img src={appIcon} alt="" width={160} height={160} className="absolute -bottom-4 -left-4 size-36 object-contain drop-shadow-2xl" />
          </section>

          <section aria-labelledby="categories-title">
            <h2 id="categories-title" className="text-lg font-black">شنو تحتاج اليوم؟</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {categories.map((item) => <button key={item.id} type="button" onClick={() => openOrder(item.id)} className="group rounded-2xl border border-border bg-card p-4 text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-xl active:scale-[0.98]">
                <span className="grid size-11 place-items-center rounded-xl bg-surface-warm text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><item.icon /></span>
                <h3 className="mt-4 text-sm font-extrabold leading-6">{item.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
              </button>)}
            </div>
          </section>

          {activeOrder && <button type="button" onClick={() => setTracked(activeOrder)} className="flex w-full items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-right">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success text-success-foreground"><Package className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-success">طلب نشط</span><span className="block truncate font-extrabold">{progress.find(([s]) => s === activeOrder.status)?.[1]}</span></span>
            <ChevronLeft className="shrink-0 text-success" />
          </button>}
        </div> : <div className="animate-float-in space-y-6 pt-2">
          <h1 className="text-2xl font-black">طلباتي</h1>
          {myOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Package className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-bold">ما عندك طلبات بعد</p>
            <Button variant="hero" className="mt-4" onClick={() => selectTab("home")}>اطلب الآن</Button>
          </div> : <>
            <OrderList title="الطلبات الحالية" orders={activeOrders} onOpen={setTracked} />
            <OrderList title="السجل السابق" orders={pastOrders} onOpen={setTracked} />
          </>}
        </div>}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={selected.name}>
        <form onSubmit={submitOrder}>
          <div className="mb-5 flex items-center gap-2">{[1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />)}</div>
          {step === 1 ? <div className="animate-float-in">
            <label className="text-sm font-extrabold" htmlFor="items">قائمة الأغراض المطلوبة</label>
            <div className="relative mt-2"><textarea ref={textareaRef} id="items" value={items} onInput={resizeItems} onChange={(e) => setItems(e.target.value)} rows={5} placeholder={'• 2 كيلو رز\n• كارتون ماء\n• منظف ملابس'} className="min-h-36 w-full resize-none rounded-xl border border-input bg-background p-4 pb-12 text-sm leading-7 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></div><VoiceRecorder path={voicePath} onChange={setVoicePath} />
            {error && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p>}
            <Button type="button" variant="hero" size="xl" className="mt-5 w-full" onClick={() => { if (items.trim()) { setError(""); setStep(2); } else setError("اكتب الأغراض المطلوبة أولاً."); }}>كمّل تفاصيل التوصيل <ChevronLeft /></Button>
          </div> : <div className="animate-float-in space-y-5">
            <Field label="عنوان التسليم" icon={<MapPin />}><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="المنطقة، الشارع، أقرب نقطة دالة" className="w-full bg-transparent py-3 outline-none" /><Button type="button" variant="ghost" size="icon" aria-label="تحديد على الخريطة" title="تحديد على الخريطة"><MapPin /></Button></Field>
            <div><label className="text-sm font-extrabold">رقم الهاتف للتأكيد</label><div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-input bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><span dir="ltr" className="flex items-center gap-2 border-l border-input px-3 font-bold">🇮🇶 +964</span><input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XX XXX XXXX" className="min-w-0 px-4 py-3 outline-none" /></div></div>
            <div><label className="text-sm font-extrabold">الحد الأعلى للمشتريات <span className="font-normal text-muted-foreground">(اختياري)</span></label><div className="mt-2 flex items-center rounded-xl border border-input bg-background px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><input dir="ltr" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50,000" className="min-w-0 flex-1 py-3 outline-none" /><span className="font-bold text-muted-foreground">د.ع</span></div></div>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p>}
            <Button variant="hero" size="xl" className="w-full" disabled={sending}>{sending ? "جاري إرسال طلبك..." : "تأكيد وإرسال الطلب لـ نم نم"}<ArrowLeft /></Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>رجوع للقائمة</Button>
          </div>}
        </form>
      </Sheet>

      <Sheet open={!!tracked} onClose={() => setTracked(null)} title={tracked ? `طلب #${tracked.id.slice(0, 8).toUpperCase()}` : ""}>
        {tracked && <div>
          <div className="space-y-1">
            {progress.map(([status, title, note], index) => {
              const done = index <= current;
              return <div key={status} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <div className="flex flex-col items-center"><span className={`grid size-9 place-items-center rounded-full border-2 transition ${done ? "border-success bg-success text-success-foreground" : "border-border bg-background text-muted-foreground"}`}>{done ? <Check className="size-4" /> : index + 1}</span>{index < 3 && <span className={`h-9 w-0.5 ${index < current ? "bg-success" : "bg-border"}`} />}</div>
                <div className="pt-1"><p className={`font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{title}</p><p className="text-sm text-muted-foreground">{note}</p></div>
              </div>;
            })}
          </div>
          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            <h3 className="font-extrabold">ملخص الحساب</h3>
            <div className="mt-3 space-y-3 text-sm">
              <PriceRow label="سعر المشتريات" value={tracked.purchase_price} pending={!tracked.purchase_price} />
              <PriceRow label="أجرة التوصيل" value={tracked.delivery_fee} pending={!tracked.delivery_fee} />
              <PriceRow label="المجموع الكلي" value={tracked.total_price ?? 0} pending={!tracked.total_price} strong />
            </div>
          </div>
        </div>}
      </Sheet>

      <BottomNav active={tab} onSelect={selectTab} />
    </main>
  );
}

function OrderList({ title, orders, onOpen }: { title: string; orders: NonNullable<TrackedOrder>[]; onOpen: (o: NonNullable<TrackedOrder>) => void }) {
  if (orders.length === 0) return null;
  return <section>
    <h2 className="text-sm font-bold text-muted-foreground">{title}</h2>
    <div className="mt-3 space-y-3">
      {orders.map((order) => {
        const label = progress.find(([s]) => s === order.status)?.[1] ?? order.status;
        const done = order.status === "completed";
        return <button key={order.id} type="button" onClick={() => onOpen(order)} className="w-full rounded-2xl border border-border bg-card p-4 text-right shadow-sm transition hover:shadow-xl">
          <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate font-extrabold">{order.store_type}</span><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${done ? "bg-muted text-muted-foreground" : "bg-success/10 text-success"}`}>{label}</span></div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{order.items_list}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>#{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString("ar-IQ")}</span>{order.total_price ? <span className="font-bold text-foreground">{Number(order.total_price).toLocaleString("ar-IQ")} د.ع</span> : null}</div>
        </button>;
      })}
    </div>
  </section>;
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return <div dir="rtl" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in" />
    <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom duration-300 sm:rounded-3xl">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="min-w-0 truncate text-lg font-black">{title}</h2><Button variant="ghost" size="icon" aria-label="إغلاق" onClick={onClose}><X /></Button></div>
      {children}
    </div>
  </div>;
}

function BrandHeader() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 sm:flex sm:justify-between">
    <Link to="/" className="flex min-w-0 items-center gap-3"><img src={appIcon} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl shadow-sm" /><div className="min-w-0"><p className="truncate text-2xl font-black text-primary">نم نم</p><p className="truncate text-xs font-medium text-muted-foreground">نشتري ونوصل لك أي شيء</p></div></Link>
    <div className="flex shrink-0 items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold shadow-sm sm:flex"><MapPin className="size-4 text-primary" />توصيل إلى: منطقتك الحالية</span><Button variant="ghost" size="icon" aria-label="تسجيل الخروج" title="تسجيل الخروج" onClick={() => void signOut()}><LogOut /></Button></div>
  </header>;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) { return <div><label className="text-sm font-extrabold">{label}</label><div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><span className="text-primary">{icon}</span>{children}</div></div>; }

function PriceRow({ label, value, pending, strong }: { label: string; value: number; pending: boolean; strong?: boolean }) { return <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-border pt-3 text-lg font-black" : "text-muted-foreground"}`}><span>{label}</span><span className={strong ? "text-primary" : "font-bold text-foreground"}>{pending ? "يُحدد بعد الشراء" : `${Number(value).toLocaleString("ar-IQ")} د.ع`}</span></div>; }
function VoiceRecorder({ path, onChange }: { path: string | null; onChange: (p: string | null) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "uploading" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (state !== "recording") return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        setPreview(URL.createObjectURL(blob));
        setState("uploading");
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return setState("error");
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const filePath = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("voice-notes").upload(filePath, blob, { contentType: type });
        if (error) return setState("error");
        onChange(filePath); setState("idle");
      };
      recorder.current = rec; setSeconds(0); rec.start(); setState("recording");
    } catch { setState("error"); }
  }

  function remove() { onChange(null); setPreview(null); setState("idle"); }

  return <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
    {state === "recording" ? <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-bold text-destructive"><span className="size-2.5 animate-pulse rounded-full bg-destructive" />جاري التسجيل {seconds}ث</span>
      <Button type="button" size="sm" variant="destructive" onClick={() => recorder.current?.stop()}>إيقاف</Button>
    </div> : preview && (path || state === "uploading") ? <div className="flex items-center gap-2">
      <audio controls src={preview} className="h-10 min-w-0 flex-1" />
      {state === "uploading" ? <span className="text-xs text-muted-foreground">جاري الرفع...</span> : <Button type="button" size="icon" variant="ghost" aria-label="حذف التسجيل" onClick={remove}><X /></Button>}
    </div> : <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{state === "error" ? "تعذّر التسجيل. تأكد من السماح بالمايكروفون." : "تكدر تسجّل ملاحظة صوتية بدل الكتابة"}</span>
      <Button type="button" size="sm" variant="outline" onClick={() => void start()}><Mic />تسجيل</Button>
    </div>}
  </div>;
}
