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