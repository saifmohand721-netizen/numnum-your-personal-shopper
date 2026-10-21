export interface LedgerOrder {
  status: string;
  delivery_fee: number | null;
  total_price: number | null;
}

/** Accounting rule: financial totals are aggregated from completed orders only. */
export function splitLedger<T extends LedgerOrder>(orders: readonly T[]) {
  const completed = orders.filter((o) => o.status === "completed");
  const open = orders.filter((o) => o.status !== "completed");
  const fees = completed.reduce((sum, o) => sum + Number(o.delivery_fee ?? 0), 0);
  const amount = completed.reduce((sum, o) => sum + Number(o.total_price ?? 0), 0);
  return { completed, open, completedTotals: { count: completed.length, fees, amount } };
}
