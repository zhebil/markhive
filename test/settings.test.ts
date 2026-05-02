import test from "node:test";
import assert from "node:assert/strict";

function makeStorageShim() {
  const store: Record<string, unknown> = {};
  return {
    local: {
      get(keys: string | string[] | Record<string, unknown>, cb: (result: Record<string, unknown>) => void) {
        const result: Record<string, unknown> = {};
        const keyList = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
        for (const k of keyList) {
          if (k in store) result[k] = store[k];
        }
        cb(result);
      },
      set(items: Record<string, unknown>, cb?: () => void) {
        for (const [k, v] of Object.entries(items)) {
          store[k] = v;
        }
        cb?.();
      },
    },
  };
}

(globalThis as unknown as { chrome: unknown }).chrome = { storage: makeStorageShim() };

const { loadSettings, saveSettings, DEFAULTS } = await import("../src/lib/settings.ts");

test("loadSettings returns defaults on first load", async () => {
  const settings = await loadSettings();
  assert.deepEqual(settings, DEFAULTS);
});

test("saveSettings and loadSettings round-trip", async () => {
  const updated = { ...DEFAULTS, includeThinking: true, includeToolInputs: true };
  await saveSettings(updated);
  const loaded = await loadSettings();
  assert.deepEqual(loaded, updated);
});

test("partial saved state merges with defaults", async () => {
  (globalThis as unknown as { chrome: unknown }).chrome = { storage: makeStorageShim() };
  const shim = (globalThis as unknown as { chrome: { storage: ReturnType<typeof makeStorageShim> } }).chrome.storage;
  shim.local.set({ markhive: { includeThinking: true } });

  const loaded = await loadSettings();
  assert.equal(loaded.includeThinking, true);
  assert.equal(loaded.includeFrontmatter, DEFAULTS.includeFrontmatter);
  assert.equal(loaded.filenameTemplate, DEFAULTS.filenameTemplate);
});
