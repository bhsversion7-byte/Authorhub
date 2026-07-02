import assert from "node:assert/strict";
import {
  MAIN_PAIR_RELATION_COLOR,
  getCharacterRelationTag,
  isMainCharacter,
  isMainPairRelationship,
  normalizeRelationTag,
} from "../src/lib/relationGraphRules.js";

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

const nodes = [
  { id: "a", tag: "主角" },
  { id: "b", tag: "主角34" },
  { id: "c", tag: "主要配角" },
];
const getNodeId = (node) => (typeof node === "object" ? node.id : node);

assert.equal(isMainPairRelationship({ source: "a", target: "b" }, nodes, getNodeId), true);
assert.equal(isMainPairRelationship({ source: "a", target: "c" }, nodes, getNodeId), false);
assert.equal(isMainPairRelationship({ source: "missing", target: "b" }, nodes, getNodeId), false);

console.log("relation graph rule checks passed");
