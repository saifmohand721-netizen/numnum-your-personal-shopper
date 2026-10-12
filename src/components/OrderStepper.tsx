import { Check } from "lucide-react";
import { getStageIndex, orderStages } from "@/lib/order-status";

export function OrderStepper({ status }: { status: string }) {
  const current = getStageIndex(status);
  return <ol aria-label="مراحل الطلب" className="space-y-0">
    {orderStages.map((stage, index) => {
      const done = index < current;
      const active = index === current;
      return <li key={stage.status} aria-current={active ? "step" : undefined} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
        <div className="flex flex-col items-center">
          <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${done ? "border-success bg-success text-success-foreground" : active ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15" : "border-border bg-muted text-muted-foreground"}`}>{done || (active && status === "completed") ? <Check className="size-4" /> : index + 1}</span>
          {index < orderStages.length - 1 && <span className={`min-h-6 w-0.5 flex-1 ${index < current ? "bg-success" : "bg-border"}`} />}
        </div>
        <div className="min-w-0 pb-6">
          <p className={`text-sm font-extrabold ${active ? "text-primary" : "text-foreground"}`}>{stage.label}</p>
          <p className="mt-1 break-words text-sm leading-6 text-foreground">{stage.message}</p>
        </div>
      </li>;
    })}
  </ol>;
}