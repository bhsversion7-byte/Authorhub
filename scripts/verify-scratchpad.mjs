import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  getScratchpadNodeColor,
  getScratchpadReadingStyle,
} from "../src/lib/scratchpadAppearance.js";

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

assert.deepEqual(
  getScratchpadReadingStyle({ fontFamily: "serif", fontSize: 18 }),
  { "--editor-font-size": "18px", "--field-font-size": "18px", "--reading-font-family": 'Georgia, "Times New Roman", "Songti SC", "STSong", "Noto Serif SC", serif' },
  "the scratchpad must receive the global reading font and size",
);
assert.equal(getScratchpadNodeColor("#e7eee8", false), "#e7eee8", "light mode must render the persisted node color unchanged");
assert.equal(getScratchpadNodeColor("#e7eee8", true), "#2d465d", "dark mode must render a navy-safe node color without changing persisted data");

console.log("scratchpad persistence checks passed");
