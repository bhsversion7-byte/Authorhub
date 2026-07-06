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

const repairedWorkspace = migrateData({
  author: { username: "repaired-user" },
  novels: [
    null,
    {
      id: "novel-with-empty-records",
      title: "空记录兼容",
      characters: [null, { id: "c1", name: "C1", role: "主角" }],
      timeline: [null, { id: "t1", title: "T1" }],
    },
  ],
});

assert.equal(repairedWorkspace.novels.length, 1, "null novel entries should be discarded during migration");
assert.equal(repairedWorkspace.novels[0].characters.length, 1, "null character entries should be discarded during migration");
assert.equal(repairedWorkspace.novels[0].timeline.length, 1, "null timeline entries should be discarded during migration");
assert.equal(repairedWorkspace.novels[0].characters[0].tag, "主角1", "remaining characters should still receive migrated tags");
assert.deepEqual(repairedWorkspace.novels[0].timeline[0].images, [], "remaining timeline entries should still receive image arrays");

const shimoAdapterSource = readFileSync(new URL("../src/lib/shimoAdapter.js", import.meta.url), "utf8");
const relationGraphSource = readFileSync(new URL("../src/components/RelationGraph.jsx", import.meta.url), "utf8");
assert.ok(
  shimoAdapterSource.includes("ignoreDuplicates: true"),
  "ensureProfile should insert missing profiles without rewriting existing rows on every load",
);
assert.ok(
  !shimoAdapterSource.includes("has_completed_tour: false"),
  "ensureProfile must not reset tour completion metadata while creating/upserting profiles",
);
assert.ok(
  !relationGraphSource.includes("age: Number(") && !relationGraphSource.includes('type="number" value={draft.age}'),
  "character age should remain free-form text instead of being coerced to a number",
);

console.log("persistence rule checks passed");
