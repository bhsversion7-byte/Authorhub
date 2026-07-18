import assert from "node:assert/strict";
import {
  MAIN_PAIR_RELATION_COLOR,
  getCharacterRelationTag,
  getRelationshipVisualStyle,
  isMainCharacter,
  isMainPairRelationship,
  normalizeRelationTag,
} from "../src/lib/relationGraphRules.js";
import {
  addRelationshipRecord,
  createEmptyRelationshipDraft,
  createRelationshipId,
  getRelationGraphFocus,
  mergeCharacterDraft,
  normalizeGraphLayout,
  reduceRelationshipSelection,
  removeRelationshipRecord,
  updateRelationshipRecord,
} from "../src/lib/relationGraphModel.js";
import { readFileSync } from "node:fs";

assert.equal(MAIN_PAIR_RELATION_COLOR, "#C95F5A");

assert.equal(normalizeRelationTag("主角攻"), "主角1");
assert.equal(normalizeRelationTag("主角受"), "主角2");
assert.equal(normalizeRelationTag(" 主角34 "), "主角34");
assert.equal(normalizeRelationTag(""), "主要配角");

["主角", "主角1", "主角2", "主角34", "主角999", "主角攻", "主角受"].forEach((tag) => {
  assert.equal(isMainCharacter({ tag }), true, `${tag} should be treated as a main-character tag`);
});

["主要配角", "反派", "主角A", "副主角", "主角 1"].forEach((tag) => {
  assert.equal(isMainCharacter({ tag }), false, `${tag} should not be treated as a main-character tag`);
});

assert.equal(getCharacterRelationTag({ faction: "主角34" }), "主角34");
assert.equal(getCharacterRelationTag(null), "主要配角");
assert.equal(isMainCharacter(null), false);

const nodes = [
  { id: "a", tag: "主角" },
  { id: "b", tag: "主角34" },
  { id: "c", tag: "主要配角" },
];
const getNodeId = (node) => (typeof node === "object" ? node.id : node);

assert.equal(isMainPairRelationship({ source: "a", target: "b" }, nodes, getNodeId), true);
assert.equal(isMainPairRelationship({ source: "a", target: "c" }, nodes, getNodeId), false);
assert.equal(isMainPairRelationship({ source: "missing", target: "b" }, nodes, getNodeId), false);
assert.equal(isMainPairRelationship(null, nodes, getNodeId), false);

assert.deepEqual(
  getRelationshipVisualStyle({ source: "a", target: "b" }, nodes, getNodeId),
  { lineColor: MAIN_PAIR_RELATION_COLOR, labelColor: MAIN_PAIR_RELATION_COLOR },
  "a main-character pair must use the fixed red line and red relationship label",
);
assert.deepEqual(
  getRelationshipVisualStyle({ source: "a", target: "c" }, nodes, getNodeId),
  { lineColor: "#8BA09C", labelColor: "#72584a" },
  "ordinary relationships must retain their existing neutral visual style",
);

const unsavedDraft = {
  id: "character-a",
  name: "尚未保存的名字",
  role: "尚未保存的身份",
  background: "尚未保存的背景",
  color: "#9FA2A4",
};
assert.deepEqual(
  mergeCharacterDraft(unsavedDraft, { color: "#DDA96A" }),
  { ...unsavedDraft, color: "#DDA96A" },
  "an immediate color patch must preserve every unsaved draft field",
);

const sceneHookSource = readFileSync(new URL("../src/components/relation-graph/useRelationGraphScene.js", import.meta.url), "utf8");
[
  "selectedCharacterId",
  "selectedRelationshipId",
  "connectFrom",
  "connectTo",
  "connectLabel",
  "detailPane",
  "hoverId",
].forEach((transientState) => {
  assert.equal(
    sceneHookSource.includes(transientState),
    false,
    `${transientState} must never restart the D3 scene`,
  );
});

const emptyRelationship = createEmptyRelationshipDraft();
const selectedA = reduceRelationshipSelection(
  { selectedCharacterId: "", relationship: emptyRelationship },
  "character-a",
);
assert.deepEqual(selectedA, {
  selectedCharacterId: "character-a",
  relationship: { ...emptyRelationship, source: "character-a" },
});
const selectedB = reduceRelationshipSelection(selectedA, "character-b");
assert.equal(selectedB.selectedCharacterId, "character-a", "the inspector must remain on the relationship source");
assert.equal(selectedB.relationship.source, "character-a");
assert.equal(selectedB.relationship.target, "character-b");

const focusRelationships = [
  { id: "relation-ab", key: "relation-ab", source: "character-a", target: "character-b" },
  { id: "relation-ac", key: "relation-ac", source: "character-a", target: "character-c" },
];
assert.deepEqual(
  [...getRelationGraphFocus(focusRelationships, "character-a").nodeIds],
  ["character-a"],
  "a single click should show only the selected planet, not every adjacent planet",
);
assert.deepEqual(
  [...getRelationGraphFocus(focusRelationships, "", "relation-ab").nodeIds].sort(),
  ["character-a", "character-b"],
  "a selected relationship should show exactly its two endpoints",
);

const relationId = createRelationshipId("novel-a", { source: "character-a", target: "character-b" }, 0);
assert.equal(relationId, createRelationshipId("novel-a", { source: "character-a", target: "character-b" }, 0));
assert.notEqual(relationId, createRelationshipId("novel-a", { source: "character-a", target: "character-b" }, 1));

const firstRelationship = { id: relationId, source: "character-a", target: "character-b", label: "旧关系" };
const secondRelationship = { id: "relation-two", source: "character-b", target: "character-c", label: "朋友" };
assert.deepEqual(
  addRelationshipRecord([firstRelationship], secondRelationship),
  [firstRelationship, secondRelationship],
  "adding a relationship must retain its stable id",
);
assert.equal(
  updateRelationshipRecord([firstRelationship, secondRelationship], relationId, { label: "新关系" })[0].label,
  "新关系",
);
assert.deepEqual(removeRelationshipRecord([firstRelationship, secondRelationship], relationId), [secondRelationship]);

assert.deepEqual(
  normalizeGraphLayout({
    version: 1,
    nodes: {
      "character-a": { x: 1.4, y: -0.2, locked: 1 },
      missing: { x: 0.5, y: 0.5, locked: true },
    },
  }, ["character-a"]),
  { version: 1, nodes: { "character-a": { x: 1, y: 0, locked: true } } },
  "layout migration must clamp coordinates and discard deleted characters",
);

console.log("relation graph rule checks passed");
