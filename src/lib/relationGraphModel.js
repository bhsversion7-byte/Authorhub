const LAYOUT_VERSION = 1;

export function getRelationshipEndpointId(endpoint) {
  return typeof endpoint === "object" ? endpoint?.id ?? "" : endpoint ?? "";
}

export function createRelationshipId(novelId, relationship, index = 0) {
  const seed = [
    novelId ?? "novel",
    getRelationshipEndpointId(relationship?.source),
    getRelationshipEndpointId(relationship?.target),
    relationship?.label ?? "",
    index,
  ].join("|");
  let hash = 2166136261;
  for (let cursor = 0; cursor < seed.length; cursor += 1) {
    hash ^= seed.charCodeAt(cursor);
    hash = Math.imul(hash, 16777619);
  }
  return `relationship-${(hash >>> 0).toString(36)}`;
}

export function createNewRelationshipId() {
  if (globalThis.crypto?.randomUUID) return `relationship-${globalThis.crypto.randomUUID()}`;
  return `relationship-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeRelationships(novelId, relationships) {
  const seen = new Set();
  return (relationships ?? []).filter(Boolean).map((relationship, index) => {
    let id = relationship.id || createRelationshipId(novelId, relationship, index);
    if (seen.has(id)) id = createRelationshipId(novelId, relationship, `${index}-duplicate`);
    seen.add(id);
    return { ...relationship, id };
  });
}

export function addRelationshipRecord(relationships, relationship) {
  return [...(relationships ?? []), relationship];
}

export function updateRelationshipRecord(relationships, relationshipId, patch) {
  return (relationships ?? []).map((relationship) =>
    relationship.id === relationshipId ? { ...relationship, ...patch, id: relationship.id } : relationship,
  );
}

export function removeRelationshipRecord(relationships, relationshipId) {
  return (relationships ?? []).filter((relationship) => relationship.id !== relationshipId);
}

export function mergeCharacterDraft(draft, patch) {
  return draft ? { ...draft, ...patch } : draft;
}

export function createEmptyRelationshipDraft(source = "") {
  return { id: "", source, target: "", label: "关系" };
}

export function reduceRelationshipSelection(state, characterId) {
  const relationship = state.relationship ?? createEmptyRelationshipDraft();
  if (!relationship.source || relationship.target) {
    return {
      selectedCharacterId: characterId,
      relationship: createEmptyRelationshipDraft(characterId),
    };
  }
  if (relationship.source === characterId) return state;
  return {
    selectedCharacterId: state.selectedCharacterId || relationship.source,
    relationship: { ...relationship, target: characterId },
  };
}

function clampUnit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0, number));
}

export function normalizeGraphLayout(layout, characterIds = []) {
  const allowedIds = new Set(characterIds);
  const nodes = {};
  Object.entries(layout?.nodes ?? {}).forEach(([characterId, position]) => {
    if (!allowedIds.has(characterId)) return;
    const x = clampUnit(position?.x);
    const y = clampUnit(position?.y);
    if (x === null || y === null) return;
    nodes[characterId] = { x, y, locked: Boolean(position?.locked) };
  });
  return { version: LAYOUT_VERSION, nodes };
}

export function updateGraphLayoutNode(layout, characterId, patch) {
  const current = layout?.nodes?.[characterId] ?? { x: 0.5, y: 0.5, locked: false };
  const x = clampUnit(patch.x ?? current.x);
  const y = clampUnit(patch.y ?? current.y);
  return {
    version: LAYOUT_VERSION,
    nodes: {
      ...(layout?.nodes ?? {}),
      [characterId]: {
        x: x ?? 0.5,
        y: y ?? 0.5,
        locked: Boolean(patch.locked ?? current.locked),
      },
    },
  };
}

export function removeGraphLayoutNode(layout, characterId) {
  const nodes = { ...(layout?.nodes ?? {}) };
  delete nodes[characterId];
  return { version: LAYOUT_VERSION, nodes };
}
