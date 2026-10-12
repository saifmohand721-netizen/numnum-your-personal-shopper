/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { ORDER_STATUSES, getStageIndex } from "./order-status";

describe("order stages", () => {
  test("all five stages retain their ordered position", () => {
    expect(ORDER_STATUSES).toEqual(["pending", "buying", "delivering", "arrived", "completed"]);
    expect(getStageIndex("arrived")).toBe(3);
    expect(getStageIndex("completed")).toBe(4);
  });
  test("server status validation accepts arrived and rejects unknown statuses", () => {
    const schema = z.enum(ORDER_STATUSES);
    expect(schema.parse("arrived")).toBe("arrived");
    expect(schema.safeParse("unknown").success).toBe(false);
  });
});