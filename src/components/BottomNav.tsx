import { Link } from "@tanstack/react-router";
import { Home, Package, Truck } from "lucide-react";

type Tab = "home" | "orders" | "driver";

export function BottomNav({ active, onSelect, dark }: { active: Tab; onSelect?: (tab: "home" | "orders") => void; dark?: boolean }) {
  const base = "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition";
  const on = "text-primary";
  const off = dark ? "text-background/55 hover:text-background" : "text-muted-foreground hover:text-foreground";
  const item = (tab: "home" | "orders", label: string, Icon: typeof Home) =>
    onSelect ? (
      <button type="button" onClick={() => onSelect(tab)} className={`${base} ${active === tab ? on : off}`} aria-current={active === tab ? "page" : undefined}>
        <Icon className="size-5" />{label}
      </button>
    ) : (
      <Link to="/" search={{ tab } as never} className={`${base} ${active === tab ? on : off}`}>
        <Icon className="size-5" />{label}
      </Link>
    );
  return (
    <nav dir="rtl" aria-label="التنقل الرئيسي" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className={`mx-auto flex max-w-md items-center gap-1 rounded-2xl border p-1.5 shadow-xl backdrop-blur-xl ${dark ? "border-background/10 bg-foreground/85" : "border-border bg-card/85"}`}>
        {item("home", "الرئيسية", Home)}
        {item("orders", "طلباتي", Package)}
        <Link to="/driver" className={`${base} ${active === "driver" ? on : off}`}>
          <Truck className="size-5" />لوحة السائق
        </Link>
      </div>
    </nav>
  );
}
