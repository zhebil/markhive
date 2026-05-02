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

test("render: thinking excluded when includeThinking is false", () => {
  const conv = fixture("with-thinking");
  const out = render(conv, { ...defaultOpts, includeThinking: false });
  assert.ok(!out.includes("reasoning..."), "should not include thinking text");
  assert.ok(out.includes("The answer is 4."), "should include text content");
});

test("render: thinking included when includeThinking is true", () => {
  const conv = fixture("with-thinking");
  const out = render(conv, { ...defaultOpts, includeThinking: true });
  assert.ok(out.includes("> **Thinking**"), "should have thinking blockquote header");
  assert.ok(out.includes("> Let me think..."), "should include thinking text lines");
  assert.ok(out.includes("The answer is 4."), "should include text content");
  const thinkPos = out.indexOf("> **Thinking**");
  const textPos = out.indexOf("The answer is 4.");
  assert.ok(thinkPos < textPos, "thinking comes before text");
});

test("render: tool call rendered, result omitted (includeToolInputs only)", () => {
  const conv = fixture("with-tools");
  const out = render(conv, { ...defaultOpts, includeToolInputs: true, includeToolResults: false });
  assert.ok(out.includes("> **Tool call: web_search**"), "should render tool call");
  assert.ok(!out.includes("> **Tool result:"), "should omit tool result");
  assert.ok(out.includes("Here are the results."), "should include text");
});

test("render: result rendered, call omitted (includeToolResults only)", () => {
  const conv = fixture("with-tools");
  const out = render(conv, { ...defaultOpts, includeToolInputs: false, includeToolResults: true });
  assert.ok(!out.includes("> **Tool call:"), "should omit tool call");
  assert.ok(out.includes("> **Tool result: web_search**"), "should render tool result with name");
  assert.ok(out.includes("Found 1000 results about cats."), "should include result text");
});

test("render: both tool call and result rendered", () => {
  const conv = fixture("with-tools");
  const out = render(conv, { ...defaultOpts, includeToolInputs: true, includeToolResults: true });
  assert.ok(out.includes("> **Tool call: web_search**"), "should render tool call");
  assert.ok(out.includes("> **Tool result: web_search**"), "should render tool result");
  const callPos = out.indexOf("> **Tool call: web_search**");
  const resultPos = out.indexOf("> **Tool result: web_search**");
  assert.ok(callPos < resultPos, "tool call comes before result");
});

test("render: both tools omitted when both toggles off", () => {
  const conv = fixture("with-tools");
  const out = render(conv, { ...defaultOpts, includeToolInputs: false, includeToolResults: false });
  assert.ok(!out.includes("> **Tool call:"), "should omit tool call");
  assert.ok(!out.includes("> **Tool result:"), "should omit tool result");
  assert.ok(out.includes("Here are the results."), "should include text");
});
