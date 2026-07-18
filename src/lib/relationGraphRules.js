export const MAIN_PAIR_RELATION_COLOR = "#C95F5A";

export function normalizeRelationTag(tag = "") {
  const value = String(tag ?? "").trim();
  if (value === "主角攻") return "主角1";
  if (value === "主角受") return "主角2";
  return value || "主要配角";
}

function isMainCharacterTag(tag = "") {
  return /^主角(?:\d+)?$/.test(normalizeRelationTag(tag).trim());
}

export function getCharacterRelationTag(character = {}) {
  const source = character && typeof character === "object" ? character : {};
  return normalizeRelationTag(source.tag ?? source.faction ?? "主要配角");
}

export function isMainCharacter(character = {}) {
  if (!character || typeof character !== "object") return false;
  return isMainCharacterTag(getCharacterRelationTag(character));
}

export function isMainPairRelationship(relationship, nodes, getNodeId) {
  if (!relationship || !Array.isArray(nodes) || typeof getNodeId !== "function") return false;
  const sourceId = getNodeId(relationship.source);
  const targetId = getNodeId(relationship.target);
  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  return Boolean(source && target && isMainCharacter(source) && isMainCharacter(target));
}

export function getRelationshipVisualStyle(relationship, nodes, getNodeId) {
  if (isMainPairRelationship(relationship, nodes, getNodeId)) {
    return { lineColor: MAIN_PAIR_RELATION_COLOR, labelColor: MAIN_PAIR_RELATION_COLOR };
  }
  return { lineColor: "#8BA09C", labelColor: "#72584a" };
}
