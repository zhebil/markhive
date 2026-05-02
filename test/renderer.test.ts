import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { render } from "../src/lib/renderer.ts";
import type { RenderOptions } from "../src/lib/renderer.ts";
import type { Conversation } from "../src/lib/types.ts";

function fixture(name: string): Conversation {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf-8"));
}

const defaultOpts: RenderOptions = {
  includeFrontmatter: true,
  includeThinking: false,
  includeToolInputs: false,
  includeToolResults: false,
  exportedAt: "2026-05-02T00:00:00Z",
};

test("render: text messages with frontmatter", () => {
  const conv = fixture("simple-text");
  const out = render(conv, defaultOpts);
  assert.ok(out.includes("---"), "should have frontmatter delimiter");
  assert.ok(out.includes("title:"), "should have title field");
  assert.ok(out.includes("chat_id:"), "should have chat_id field");
  assert.ok(out.includes("## User"), "should have User heading");
  assert.ok(out.includes("Hi"), "should have user message");
  assert.ok(out.includes("## Assistant"), "should have Assistant heading");
  assert.ok(out.includes("Hello!"), "should have assistant message");
  const fmStart = out.indexOf("---");
  const fmEnd = out.indexOf("---", fmStart + 3);
  const userPos = out.indexOf("## User");
  assert.ok(fmStart < fmEnd && fmEnd < userPos, "frontmatter comes before User section");
});

test("render: no frontmatter when includeFrontmatter is false", () => {
  const conv = fixture("simple-text");
  const out = render(conv, { ...defaultOpts, includeFrontmatter: false });
  assert.ok(!out.includes("---"), "should not have --- delimiter");
  assert.ok(out.includes("## User"), "should still have User heading");
});
