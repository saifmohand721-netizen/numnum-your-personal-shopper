/// <reference types="bun" />
import { expect, test } from "bun:test";
import { forgetDriverPin, readDriverPin, rememberDriverPin } from "./driver-storage";

test("successful credentials survive reopening and explicit logout removes them", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  expect(readDriverPin(storage)).toBe("");
  rememberDriverPin(storage, "test-driver-credential");
  expect(readDriverPin(storage)).toBe("test-driver-credential");
  forgetDriverPin(storage);
  expect(readDriverPin(storage)).toBe("");
});

test("unavailable local storage does not crash login or logout", () => {
  const storage = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); }, removeItem: () => { throw Error("blocked"); } };
  expect(readDriverPin(storage)).toBe("");
  expect(() => rememberDriverPin(storage, "test-driver-credential")).not.toThrow();
  expect(() => forgetDriverPin(storage)).not.toThrow();
});