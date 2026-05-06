import test from "node:test";
import assert from "node:assert/strict";
import { findConversationInCache, type ReactQueryCache } from "../src/lib/idb-cache.ts";

const CHAT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_ID = "11111111-2222-3333-4444-555555555555";

function makeConversation(uuid: string) {
  return {
    uuid,
    name: "Test conversation",
    chat_messages: [
      { uuid: "msg-1", text: "Hello" },
      { uuid: "msg-2", text: "World" },
    ],
  };
}

function makeCache(queries: ReactQueryCache["clientState"]["queries"]): ReactQueryCache {
  return { clientState: { queries } };
}

test("happy path: finds conversation matching chatId", () => {
  const cache = makeCache([
    {
      queryKey: ["chat_conversation_tree", { orgUuid: "org-1" }, { uuid: CHAT_ID }, { returnDanglingHumanMessage: false }],
      state: { data: makeConversation(CHAT_ID) },
    },
  ]);
  const result = findConversationInCache(cache, CHAT_ID);
  assert.deepEqual(result, makeConversation(CHAT_ID));
});

test("multiple queries with same shape: picks the one matching chatId", () => {
  const cache = makeCache([
    {
      queryKey: ["chat_conversation_tree", { orgUuid: "org-1" }, { uuid: OTHER_ID }, {}],
      state: { data: makeConversation(OTHER_ID) },
    },
    {
      queryKey: ["chat_conversation_tree", { orgUuid: "org-1" }, { uuid: CHAT_ID }, {}],
      state: { data: makeConversation(CHAT_ID) },
    },
  ]);
  const result = findConversationInCache(cache, CHAT_ID) as Record<string, unknown>;
  assert.equal(result?.["uuid"], CHAT_ID);
});

test("chat_messages field renamed: returns null (loud failure)", () => {
  const broken = { uuid: CHAT_ID, name: "Test", messages: [{ text: "hi" }] };
  const cache = makeCache([
    {
      queryKey: ["chat_conversation_tree", {}, { uuid: CHAT_ID }, {}],
      state: { data: broken },
    },
  ]);
  assert.equal(findConversationInCache(cache, CHAT_ID), null);
});

test("uuid field renamed: returns null (loud failure)", () => {
  const broken = { id: CHAT_ID, name: "Test", chat_messages: [] };
  const cache = makeCache([
    {
      queryKey: ["chat_conversation_tree", {}, { uuid: CHAT_ID }, {}],
      state: { data: broken },
    },
  ]);
  assert.equal(findConversationInCache(cache, CHAT_ID), null);
});

test("chatId not present anywhere: returns null", () => {
  const cache = makeCache([
    {
      queryKey: ["some_other_query"],
      state: { data: makeConversation(OTHER_ID) },
    },
  ]);
  assert.equal(findConversationInCache(cache, CHAT_ID), null);
});

test("old shape compatibility: queryKey shape is ignored, data match wins", () => {
  const cache = makeCache([
    {
      // Old-style flat queryKey that just contains the chatId string
      queryKey: [CHAT_ID],
      state: { data: makeConversation(CHAT_ID) },
    },
  ]);
  const result = findConversationInCache(cache, CHAT_ID) as Record<string, unknown>;
  assert.equal(result?.["uuid"], CHAT_ID);
});

test("conversation nested inside state.data: still found within depth limit", () => {
  const cache = makeCache([
    {
      queryKey: ["some_query"],
      state: { data: { conversation: makeConversation(CHAT_ID) } },
    },
  ]);
  const result = findConversationInCache(cache, CHAT_ID) as Record<string, unknown>;
  assert.equal(result?.["uuid"], CHAT_ID);
});

test("empty cache: returns null", () => {
  assert.equal(findConversationInCache(undefined, CHAT_ID), null);
  assert.equal(findConversationInCache({}, CHAT_ID), null);
  assert.equal(findConversationInCache({ clientState: { queries: [] } }, CHAT_ID), null);
});
