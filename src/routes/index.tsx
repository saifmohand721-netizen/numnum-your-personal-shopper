import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ShoppingBag, Truck } from "lucide-react";

import appIcon from "@/assets/diz-app-icon.png";
import customerImg from "@/assets/welcome-customer.jpg";
import driverImg from "@/assets/welcome-driver.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "دز — نشتري ونوصل لك أي شيء" },
      { name: "description", content: "دز: خدمة شراء وتوصيل شخصية. اطلب أي شيء ونوصله لباب بيتك، أو انضم سائقاً معنا." },
      { property: "og:title", content: "دز — نشتري ونوصل لك أي شيء" },
      { property: "og:description", content: "اطلب كزبون أو انضم سائقاً — دز توصلك بكل شيء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <main dir="rtl" className="min-h-screen bg-foreground text-background">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <img src={appIcon} alt="شعار دز" width={48} height={48} className="size-12 rounded-xl shadow-lg" />
          <div>
            <p className="text-2xl font-black leading-none">دز</p>
            <p className="mt-1 text-xs text-background/55">نشتري ونوصل لك أي شيء</p>
          </div>
        </header>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-black leading-snug sm:text-4xl">أهلاً بك بدز 👋</h1>
          <p className="mt-2 text-sm text-background/60">اختر كيف تحب تكمل</p>
        </div>

        <div className="mt-7 grid flex-1 content-start gap-4 sm:grid-cols-2">
          <RoleCard
            to="/auth"
            search={{ mode: "up" }}
            img={customerImg}
            alt="زبون يستلم طلبه عند باب البيت"
            icon={<ShoppingBag className="size-5" />}
            title="زبون"
            desc="أنشئ حسابك بدقائق، اطلب أغراضك من أي متجر ودز يوصلها لباب بيتك"
            cta="أنشئ حسابك واطلب"
            primary
          />
          <RoleCard
            to="/driver-auth"
            img={driverImg}
            alt="سائق توصيل على دراجته"
            icon={<Truck className="size-5" />}
            title="سائق"
            desc="انضم لفريق دز، استلم الطلبات القريبة منك وابدأ الربح"
            cta="دخول السائقين"
          />
        </div>

        <p className="mt-6 text-center text-[11px] text-background/40">متاح الآن في المسيب — وقريباً بباقي مناطق شمال بابل</p>
      </div>
    </main>
  );
}

function RoleCard({ to, search, img, alt, icon, title, desc, cta, primary }: {
  to: string;
  search?: Record<string, string>;
  img: string;
  alt: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group relative block min-h-72 overflow-hidden rounded-3xl border border-background/10 shadow-2xl transition duration-300 hover:-translate-y-1 hover:shadow-primary/20 active:scale-[0.98] sm:min-h-96"
    >
      <img src={img} alt={alt} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-right">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${primary ? "bg-primary text-primary-foreground" : "bg-background/15 text-background backdrop-blur"}`}>
          {icon}{title}
        </span>
        <p className="mt-3 text-lg font-black leading-7 text-white">{desc}</p>
        <span className={`mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${primary ? "bg-primary text-primary-foreground group-hover:brightness-110" : "bg-white/15 text-white backdrop-blur group-hover:bg-white/25"}`}>
          {cta}<ChevronLeft className="size-4" />
        </span>
      </div>
    </Link>
  );
}
