import test from "node:test";
import assert from "node:assert/strict";

import {
  getStoredValue,
  setStoredValue,
  removeStoredValue,
} from "@/lib/client-storage";

test("getStoredValue returns fallback when window is undefined", () => {
  const originalWindow = globalThis.window;
  // Ensure window is not defined
  // @ts-expect-error - simulate server environment
  delete globalThis.window;

  const result = getStoredValue("key", "fallback");
  assert.equal(result, "fallback");

  if (originalWindow) {
    globalThis.window = originalWindow;
  } else {
    // @ts-expect-error - restore to undefined
    delete globalThis.window;
  }
});

test("client storage helpers read and write JSON values", () => {
  const store = new Map<string, string>();
  const originalWindow = globalThis.window;

  const mockWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  } as unknown as Window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    get: () => mockWindow,
  });

  const payload = { team: "Storm" };
  setStoredValue("favorite", payload);

  assert.deepEqual(store.get("favorite"), JSON.stringify(payload));

  const retrieved = getStoredValue("favorite", { team: "Default" });
  assert.deepEqual(retrieved, payload);

  removeStoredValue("favorite");
  assert.equal(store.has("favorite"), false);

  if (originalWindow) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  } else {
    // @ts-expect-error - cleanup
    delete globalThis.window;
  }
});
