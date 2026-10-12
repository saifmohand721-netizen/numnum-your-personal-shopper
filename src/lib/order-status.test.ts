import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { z } from "zod";
import { ORDER_STATUSES, getStageIndex } from "./order-status";

describe("order stages", () => {
  test("all five stages retain their ordered position", () => {
    assert.deepEqual(ORDER_STATUSES, ["pending", "buying", "delivering", "arrived", "completed"]);
    assert.equal(getStageIndex("arrived"), 3);
    assert.equal(getStageIndex("completed"), 4);
  });
  test("server status validation accepts arrived and rejects unknown statuses", () => {
    const schema = z.enum(ORDER_STATUSES);
    assert.equal(schema.parse("arrived"), "arrived");
    assert.equal(schema.safeParse("unknown").success, false);
  });
});