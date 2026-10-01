import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Hammer,
  MapPin,
  Mic,
  Package,
  Phone,
  Pill,
  ShoppingBasket,
  Sparkles,
  X,
} from "lucide-react";

import appIcon from "@/assets/numnum-app-icon.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/")({
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
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("grocery");
  const [items, setItems] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState<TrackedOrder>(null);
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
    if (!tracked) return;
    const timer = window.setInterval(async () => {
      const latest = await trackOrder({ data: { id: tracked.id, phone: `+964${phone}` } });
      if (latest) setTracked(latest);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [tracked?.id, phone]);

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
    const { data, error: insertError } = await supabase
      .from("orders")
      .insert({
        customer_phone: `+964${phone.replace(/\D/g, "").replace(/^0/, "")}`,
        store_type: categories.find((item) => item.id === category)?.name ?? category,
        items_list: items.trim(),
        delivery_address: address.trim(),
        budget_limit: budget ? Number(budget.replace(/\D/g, "")) : null,
      })
      .select("id,status,store_type,items_list,purchase_price,delivery_fee,total_price,created_at")
      .single();
    setSending(false);
    if (insertError || !data) {
      setError("تعذّر إرسال الطلب الآن. جرّب مرة ثانية بعد لحظات.");
      return;
    }
    setTracked(data);
  }

  if (tracked) {
    const current = Math.max(0, progress.findIndex(([status]) => status === tracked.status));
    return (
      <main dir="rtl" className="min-h-screen bg-background px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl animate-float-in">
          <BrandHeader />
          <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="bg-success px-6 py-7 text-success-foreground sm:px-9">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-background/15"><Check /></span>
                <div className="min-w-0"><p className="text-sm font-bold opacity-80">طلبك مؤكد</p><h1 className="truncate text-2xl font-black">نم نم وياك بالطريق</h1></div>
              </div>
              <p className="mt-4 text-sm opacity-85">رقم الطلب: {tracked.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="p-6 sm:p-9">
              <div className="space-y-1">
                {progress.map(([status, title, note], index) => {
                  const done = index <= current;
                  return <div key={status} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                    <div className="flex flex-col items-center"><span className={`grid size-9 place-items-center rounded-full border-2 ${done ? "border-success bg-success text-success-foreground" : "border-border bg-background text-muted-foreground"}`}>{done ? <Check className="size-4" /> : index + 1}</span>{index < 3 && <span className={`h-12 w-0.5 ${index < current ? "bg-success" : "bg-border"}`} />}</div>
                    <div className="pt-1"><p className={`font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{title}</p><p className="text-sm text-muted-foreground">{note}</p></div>
                  </div>;
                })}
              </div>
              <div className="mt-7 border-t border-border pt-6">
                <h2 className="font-extrabold">ملخص الحساب</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <PriceRow label="سعر المشتريات" value={tracked.purchase_price} pending={!tracked.purchase_price} />
                  <PriceRow label="أجرة التوصيل" value={tracked.delivery_fee} pending={!tracked.delivery_fee} />
                  <PriceRow label="المجموع الكلي" value={tracked.total_price ?? 0} pending={!tracked.total_price} strong />
                </div>
              </div>
              <Button variant="outline" size="lg" className="mt-7 w-full rounded-xl" onClick={() => setTracked(null)}>إنشاء طلب جديد</Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background pb-24">
      {!dismissInstall && <div className="border-b border-primary/15 bg-surface-warm px-4 py-2.5">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="min-w-0 text-xs font-medium text-foreground sm:text-sm">لطلب أسرع وتجربة أفضل، ثبّت نم نم على شاشتك الرئيسية</p>
          <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="sm" className="text-primary" onClick={() => void deferredInstall.current?.prompt()}>تثبيت</Button><Button variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setDismissInstall(true)}><X /></Button></div>
        </div>
      </div>}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <BrandHeader />
        <section className="grid items-center gap-8 py-10 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div className="animate-float-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-bold text-success"><span className="size-2 rounded-full bg-success" />متوفر الآن لخدمتك</span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.18] sm:text-5xl lg:text-6xl">نم نم .. نشتري لك <span className="text-primary">كلشي</span> ونوصله لباب بيتك!</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">من مقاضي البيت إلى طلبك الخاص. اكتب اللي تحتاجه، وخلي الباقي علينا.</p>
            <div className="mt-7 flex items-center gap-3 text-sm font-bold text-foreground"><span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Sparkles /></span>شراء شخصي · توصيل سريع · متابعة مباشرة</div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-8 rounded-full bg-primary/10 blur-3xl" />
            <img src={appIcon} alt="صندوق نم نم السريع" width={1024} height={1024} className="relative aspect-square w-full object-contain drop-shadow-2xl" />
          </div>
        </section>

        <section aria-labelledby="categories-title" className="pb-12">
          <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-primary">اختر وجهتك</p><h2 id="categories-title" className="mt-1 text-2xl font-black">شنو تحتاج اليوم؟</h2></div><span className="hidden text-sm text-muted-foreground sm:block">نشتري من أي متجر تختاره</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {categories.map((item) => <button key={item.id} type="button" onClick={() => { setCategory(item.id); document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" }); }} className={`group min-h-40 rounded-2xl border p-4 text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-5 ${category === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground"}`}>
              <span className={`grid size-11 place-items-center rounded-xl ${category === item.id ? "bg-background/15" : "bg-surface-warm text-primary"}`}><item.icon /></span>
              <h3 className="mt-5 text-base font-extrabold leading-6">{item.name}</h3><p className={`mt-1 text-xs ${category === item.id ? "opacity-80" : "text-muted-foreground"}`}>{item.note}</p>
            </button>)}
          </div>
        </section>

        <section id="order-form" className="grid gap-8 border-t border-border py-12 lg:grid-cols-[.75fr_1.25fr] lg:py-16">
          <div><p className="text-sm font-bold text-primary">طلبك بثلاث خطوات</p><h2 className="mt-2 text-3xl font-black">احجيلنا شتريد، وإحنا نتصرّف</h2><p className="mt-4 leading-7 text-muted-foreground">ما تحتاج تبحث بين عشرات المتاجر. نم نم يشتري بدالك ويوصل كلشي لمكانك.</p>
            <div className="mt-8 flex items-center gap-3">{[1,2].map((item) => <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-primary" : "bg-border"}`} />)}</div><p className="mt-2 text-xs font-bold text-muted-foreground">الخطوة {step} من 2</p>
          </div>
          <form onSubmit={submitOrder} className="rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-8">
            {step === 1 ? <div className="animate-float-in">
              <label className="text-sm font-extrabold" htmlFor="items">قائمة الأغراض المطلوبة</label>
              <div className="relative mt-2"><textarea ref={textareaRef} id="items" value={items} onInput={resizeItems} onChange={(e) => setItems(e.target.value)} rows={5} placeholder={'• 2 كيلو رز\n• كارتون ماء\n• منظف ملابس'} className="min-h-36 w-full resize-none rounded-xl border border-input bg-background p-4 pb-12 text-sm leading-7 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /><Button type="button" variant="ghost" size="sm" className="absolute bottom-2 left-2 text-muted-foreground" title="قريباً"><Mic />ملاحظة صوتية</Button></div>
              <Button type="button" variant="hero" size="xl" className="mt-5 w-full" onClick={() => items.trim() ? setStep(2) : setError("اكتب الأغراض المطلوبة أولاً.")}>كمّل تفاصيل التوصيل <ChevronLeft /></Button>
            </div> : <div className="animate-float-in space-y-5">
              <Field label="عنوان التسليم" icon={<MapPin />}><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="المنطقة، الشارع، أقرب نقطة دالة" className="w-full bg-transparent py-3 outline-none" /><Button type="button" variant="ghost" size="icon" aria-label="تحديد على الخريطة" title="تحديد على الخريطة"><MapPin /></Button></Field>
              <div><label className="text-sm font-extrabold">رقم الهاتف للتأكيد</label><div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-input bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><span dir="ltr" className="flex items-center gap-2 border-l border-input px-3 font-bold">🇮🇶 +964</span><input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XX XXX XXXX" className="min-w-0 px-4 py-3 outline-none" /></div></div>
              <div><label className="text-sm font-extrabold">الحد الأعلى للمشتريات <span className="font-normal text-muted-foreground">(اختياري)</span></label><div className="mt-2 flex items-center rounded-xl border border-input bg-background px-4 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><input dir="ltr" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="50,000" className="min-w-0 flex-1 py-3 outline-none" /><span className="font-bold text-muted-foreground">د.ع</span></div></div>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</p>}
              <Button variant="hero" size="xl" className="w-full" disabled={sending}>{sending ? "جاري إرسال طلبك..." : "تأكيد وإرسال الطلب لـ نم نم"}<ArrowLeft /></Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>رجوع للقائمة</Button>
            </div>}
          </form>
        </section>
      </div>
    </main>
  );
}

function BrandHeader() {
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 sm:flex sm:justify-between">
    <Link to="/" className="flex min-w-0 items-center gap-3"><img src={appIcon} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl shadow-sm" /><div className="min-w-0"><p className="truncate text-2xl font-black text-primary">نم نم</p><p className="truncate text-xs font-medium text-muted-foreground">نشتري ونوصل لك أي شيء</p></div></Link>
    <div className="flex shrink-0 items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold shadow-sm sm:flex"><MapPin className="size-4 text-primary" />توصيل إلى: منطقتك الحالية</span><Button variant="ghost" size="sm" asChild><Link to="/driver"><Package />السائق</Link></Button></div>
  </header>;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) { return <div><label className="text-sm font-extrabold">{label}</label><div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><span className="text-primary">{icon}</span>{children}</div></div>; }

function PriceRow({ label, value, pending, strong }: { label: string; value: number; pending: boolean; strong?: boolean }) { return <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-border pt-3 text-lg font-black" : "text-muted-foreground"}`}><span>{label}</span><span className={strong ? "text-primary" : "font-bold text-foreground"}>{pending ? "يُحدد بعد الشراء" : `${Number(value).toLocaleString("ar-IQ")} د.ع`}</span></div>; }