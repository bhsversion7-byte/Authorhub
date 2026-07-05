import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const shimoAdapterSource = readFileSync(new URL("../src/lib/shimoAdapter.js", import.meta.url), "utf8");
assert.ok(
  shimoAdapterSource.includes("ignoreDuplicates: true"),
  "ensureProfile should insert missing profiles without rewriting existing rows on every load",
);
assert.ok(
  !shimoAdapterSource.includes("has_completed_tour: false"),
  "ensureProfile must not reset tour completion metadata while creating/upserting profiles",
);

console.log("persistence rule checks passed");
