export const ORDER_STATUSES = ["pending", "buying", "delivering", "arrived", "completed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStages = [
  { status: "pending", label: "وصلنا طلبك", message: "وصلنا طلبك يا حلو، وهسّه كاعد نرتّبه إلك! ☕" },
  { status: "buying", label: "قيد التجهيز", message: "طلبك كاعد يتجهز بكل حب ودقة! 📦✨" },
  { status: "delivering", label: "السائق في الطريق", message: "السائق طار بإتجاهك وداس بنزين، حضّر روحك! 🛵" },
  { status: "arrived", label: "السائق عند الباب", message: "السائق صار باب بيتكم، يرحم والديك اخرج استلم الطلب! 📍" },
  { status: "completed", label: "مكتمل", message: "بالعافية على قلبك! لا تنسى تقيّم الخدمة وتدلل علينا 🌟" },
] as const;

export function getStageIndex(status: string) {
  return Math.max(0, orderStages.findIndex((stage) => stage.status === status));
}

export function getStatusLabel(status: string) {
  return orderStages.find((stage) => stage.status === status)?.label ?? status;
}
/** Pending and preparing orders are pinned on top; within each group newest first. */
export function sortOrdersForStaff<T extends { status: string; created_at: string }>(orders: readonly T[]): T[] {
  const pinned = (s: string) => (s === "pending" || s === "buying" ? 0 : 1);
  return [...orders].sort((a, b) => pinned(a.status) - pinned(b.status) || b.created_at.localeCompare(a.created_at));
}

/** Calm tone per status for badges and card accents. */
export function getStatusTone(status: string): { badge: string; bar: string } {
  if (status === "pending") return { badge: "bg-amber-400/15 text-amber-500 ring-1 ring-amber-400/30", bar: "bg-amber-400" };
  if (status === "buying") return { badge: "bg-sky-400/15 text-sky-500 ring-1 ring-sky-400/30", bar: "bg-sky-400" };
  if (status === "completed") return { badge: "bg-success/15 text-success ring-1 ring-success/30", bar: "bg-success" };
  return { badge: "bg-primary/15 text-primary ring-1 ring-primary/30", bar: "bg-primary" };
}
