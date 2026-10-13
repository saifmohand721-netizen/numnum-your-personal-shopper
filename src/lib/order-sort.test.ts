import { test } from "node:test";
import assert from "node:assert/strict";
import { sortOrdersForStaff } from "./order-status";

test("pending and preparing pinned on top, newest first", () => {
  const out = sortOrdersForStaff([
    { id: "a", status: "completed", created_at: "2026-10-13T10:00:00Z" },
    { id: "b", status: "pending", created_at: "2026-10-12T10:00:00Z" },
    { id: "c", status: "buying", created_at: "2026-10-13T09:00:00Z" },
    { id: "d", status: "delivering", created_at: "2026-10-13T11:00:00Z" },
  ]);
  assert.deepEqual(out.map((o) => o.id), ["c", "b", "d", "a"]);
});
