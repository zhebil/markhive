import test from "node:test";
import assert from "node:assert/strict";
import { buildFilename } from "../src/lib/filename.ts";
import type { Conversation } from "../src/lib/types.ts";

const base: Conversation = {
  uuid: "7e0c1234-5678-90ab-cdef-1234567890ab",
  name: "Hello World",
  model: "claude-opus-4-5",
  created_at: "2026-05-01T10:00:00Z",
  chat_messages: [],
};

test("buildFilename produces date-slug.md", () => {
  assert.equal(buildFilename(base), "2026-05-01-hello-world.md");
});

test("buildFilename uses UTC date", () => {
  const conv = { ...base, created_at: "2026-12-31T23:59:00Z" };
  assert.equal(buildFilename(conv), "2026-12-31-hello-world.md");
});
