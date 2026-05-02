import test from "node:test";
import assert from "node:assert/strict";
import { parseChatId } from "../src/lib/url-parse.ts";

test("parseChatId extracts uuid from canonical URL", () => {
  const id = parseChatId("https://claude.ai/chat/7e0c1234-5678-90ab-cdef-1234567890ab");
  assert.equal(id, "7e0c1234-5678-90ab-cdef-1234567890ab");
});

test("parseChatId returns null for non-chat URL", () => {
  assert.equal(parseChatId("https://claude.ai/"), null);
  assert.equal(parseChatId("https://example.com/chat/abc"), null);
});

test("parseChatId tolerates trailing slash", () => {
  assert.equal(
    parseChatId("https://claude.ai/chat/7e0c1234-5678-90ab-cdef-1234567890ab/"),
    "7e0c1234-5678-90ab-cdef-1234567890ab"
  );
});

test("parseChatId tolerates query string", () => {
  assert.equal(
    parseChatId("https://claude.ai/chat/7e0c1234-5678-90ab-cdef-1234567890ab?foo=bar"),
    "7e0c1234-5678-90ab-cdef-1234567890ab"
  );
});

test("parseChatId tolerates hash fragment", () => {
  assert.equal(
    parseChatId("https://claude.ai/chat/7e0c1234-5678-90ab-cdef-1234567890ab#anchor"),
    "7e0c1234-5678-90ab-cdef-1234567890ab"
  );
});

test("parseChatId accepts uppercase uuid", () => {
  assert.equal(
    parseChatId("https://claude.ai/chat/7E0C1234-5678-90AB-CDEF-1234567890AB"),
    "7E0C1234-5678-90AB-CDEF-1234567890AB"
  );
});

test("parseChatId rejects non-UUID garbage", () => {
  assert.equal(parseChatId("https://claude.ai/chat/not-a-uuid"), null);
  assert.equal(parseChatId("https://claude.ai/chat/abc123"), null);
  assert.equal(parseChatId("https://claude.ai/chat/7e0c1234-5678-90ab-cdef-1234567890ab/extra"), null);
});
