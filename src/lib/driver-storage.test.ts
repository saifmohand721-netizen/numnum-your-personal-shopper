import { test } from "node:test";
import { strict as assert } from "node:assert";
import { forgetDriverPin, readDriverPin, rememberDriverPin } from "./driver-storage";

test("successful credentials survive reopening and explicit logout removes them", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  assert.equal(readDriverPin(storage), "");
  rememberDriverPin(storage, "test-driver-credential");
  assert.equal(readDriverPin(storage), "test-driver-credential");
  forgetDriverPin(storage);
  assert.equal(readDriverPin(storage), "");
});

test("unavailable local storage does not crash login or logout", () => {
  const storage = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); }, removeItem: () => { throw Error("blocked"); } };
  assert.equal(readDriverPin(storage), "");
  assert.doesNotThrow(() => rememberDriverPin(storage, "test-driver-credential"));
  assert.doesNotThrow(() => forgetDriverPin(storage));
});