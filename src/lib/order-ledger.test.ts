import test from "node:test";
import assert from "node:assert/strict";

import { splitLedger } from "./order-ledger";

test("financial totals come from completed orders only", () => {
  const orders = [
    { status: "completed", delivery_fee: 1000, total_price: 5000 },
    { status: "completed", delivery_fee: 2000, total_price: 7000 },
    { status: "pending", delivery_fee: 9000, total_price: 9000 },
    { status: "buying", delivery_fee: 3000, total_price: 3000 },
  ];
  const { completed, open, completedTotals } = splitLedger(orders);
  assert.equal(completed.length, 2);
  assert.equal(open.length, 2);
  assert.deepEqual(completedTotals, { count: 2, fees: 3000, amount: 12000 });
});

test("no completed orders means zero totals", () => {
  const { completedTotals } = splitLedger([{ status: "delivering", delivery_fee: 500, total_price: 1500 }]);
  assert.deepEqual(completedTotals, { count: 0, fees: 0, amount: 0 });
});
