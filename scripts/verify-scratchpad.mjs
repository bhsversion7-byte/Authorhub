import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;

const {
  cacheScratchpad,
  createEmptyScratchpad,
  loadScratchpad,
  saveScratchpad,
} = await import("../src/lib/scratchpadStore.js");

const user = { id: "local-scratch-test" };
const initial = createEmptyScratchpad();
const cached = cacheScratchpad({
  ...initial,
  note: { version: 1, html: "<p><strong>不会丢失</strong></p>" },
}, user);

assert.equal(cached.pendingSync, true, "every edit should be marked pending until the save chain completes");
assert.equal((await loadScratchpad(user)).note.html, "<p><strong>不会丢失</strong></p>", "closing or refreshing must restore the latest local draft");

const saved = await saveScratchpad(cached, user);
assert.equal(saved.conflict, false);
assert.equal(saved.scratchpad.pendingSync, false, "a local-only account should be complete after its local save");
assert.equal((await loadScratchpad(user)).note.html, "<p><strong>不会丢失</strong></p>");

console.log("scratchpad persistence checks passed");
