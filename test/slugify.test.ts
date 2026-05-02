import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/lib/slugify.ts";

test("slugify handles ASCII title", () => {
  assert.equal(slugify("Hello World"), "hello-world");
});

test("slugify handles accented characters", () => {
  assert.equal(slugify("Café au lait"), "cafe-au-lait");
});

test("slugify returns untitled for emoji-only input", () => {
  assert.equal(slugify("🎉🎊"), "untitled");
});

test("slugify returns untitled for all-punctuation", () => {
  assert.equal(slugify("!!! ???"), "untitled");
});

test("slugify truncates to 80 chars", () => {
  const long = "a".repeat(200);
  assert.equal(slugify(long).length, 80);
});

test("slugify handles trailing whitespace", () => {
  assert.equal(slugify("  hello world  "), "hello-world");
});

test("slugify preserves Cyrillic letters", () => {
  assert.equal(slugify("Додатки для нагадування про воду"), "додатки-для-нагадування-про-воду");
});

test("slugify preserves mixed Cyrillic and Latin", () => {
  const out = slugify("Hello Привіт world");
  assert.ok(out.includes("hello"), "should include latin part");
  assert.ok(out.includes("привіт"), "should include Cyrillic part");
  assert.ok(out.includes("world"), "should include trailing latin");
});

test("slugify preserves Chinese characters", () => {
  const out = slugify("你好世界");
  assert.ok(out.length > 0 && out !== "untitled", "Chinese chars should produce a non-empty slug");
});

test("slugify handles mixed script with punctuation", () => {
  const out = slugify("Тест: hello! 123");
  assert.ok(out.includes("тест"), "Cyrillic word preserved");
  assert.ok(out.includes("hello"), "Latin word preserved");
  assert.ok(out.includes("123"), "number preserved");
});
