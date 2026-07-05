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
  return normalizeRelationTag(character.tag ?? character.faction ?? "主要配角");
}

export function isMainCharacter(character = {}) {
  return isMainCharacterTag(getCharacterRelationTag(character));
}

export function isMainPairRelationship(relationship, nodes, getNodeId) {
  const sourceId = getNodeId(relationship.source);
  const targetId = getNodeId(relationship.target);
  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  return Boolean(source && target && isMainCharacter(source) && isMainCharacter(target));
}
