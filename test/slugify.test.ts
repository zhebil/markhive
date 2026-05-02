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
