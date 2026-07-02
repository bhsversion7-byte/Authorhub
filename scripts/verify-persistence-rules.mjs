import assert from "node:assert/strict";
import { migrateData } from "../src/lib/shimoAdapter.js";

const emptyWorkspace = migrateData({
  author: { username: "empty-user" },
  appearance: {},
  shimoFolders: [],
  novels: [],
});

assert.equal(emptyWorkspace.novels.length, 0, "empty novel arrays must stay empty instead of restoring demo data");

const missingWorkspace = migrateData({
  author: { username: "new-user" },
});

assert.ok(missingWorkspace.novels.length > 0, "missing novel arrays should still receive the starter demo");

console.log("persistence rule checks passed");
