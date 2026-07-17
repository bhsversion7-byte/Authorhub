import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";
import Sortable from "sortablejs";
import { Plus, RotateCcw, ZoomIn } from "lucide-react";
import { patchFocusPageMap } from "../lib/focusPages.js";
import {
  createNewRelationshipId,
  mergeCharacterDraft,
  updateGraphLayoutNode,
} from "../lib/relationGraphModel.js";
import {
  MAIN_PAIR_RELATION_COLOR,
  getCharacterRelationTag,
  isMainCharacter,
  isMainPairRelationship,
} from "../lib/relationGraphRules.js";
import CharacterInspector from "./relation-graph/CharacterInspector.jsx";
import { useRelationGraphScene } from "./relation-graph/useRelationGraphScene.js";

const ROLE_TAGS = ["主角1", "主角2", "主要配角", "反派", "亲友", "家族线"];
// Cool tones first, then warm tones (pure visual ordering only - the
// values/behavior of the picker are unchanged). #9FA2A4 grey added per user
// request; #96AAB8, #8FA893, and #C08B6E added to round the palette out to 20.
const NODE_COLORS = [
  "#9FA2A4",
  "#A7B8C8",
  "#9FB1C5",
  "#96AAB8",
  "#8BA09C",
  "#C6B7D2",
  "#AFC7B6",
  "#8FA893",
  "#9EA58E",
  "#B9C4A6",
  "#C3B49A",
  "#BFA57B",
  "#A9A084",
  "#DDA96A",
  "#C08B6E",
  "#D8B7A6",
  "#C9C3AF",
  "#B7AA98",
  "#C8A2A0",
  "#D3AFA6",
];

function emptyCharacter(novelId) {
  return {
    id: `${novelId}-${Date.now()}`,
    name: "新人物",
    age: "24",
    role: "待定角色",
    tag: "主要配角",
    color: "#DDA96A",
    background: "补充人物背景、成长经历和与主线的关系。",
    secret: "隐藏设定待补全。",
    images: [],
  };
}

export default function RelationGraph({
  novel,
  onNovelChange,
  onAddCharacter,
  onUpdateCharacter,
  onAddRelationship,
  onUpdateRelationship,
  onDeleteRelationship,
  onDeleteCharacter,
  readOnly = false,
  showGraph = true,
  showDetails = true,
}) {
  const svgRef = useRef(null);
  const relationRef = useRef(null);
  const tagBoardRef = useRef(null);
  // Updated every render so the Sortable onEnd (created once per chip-count
  // change) always persists against the current novel/handlers.
  const reorderTagsRef = useRef(null);
  const nodeSelectionRef = useRef(null);
  const linkSelectionRef = useRef(null);
  const labelSelectionRef = useRef(null);
  const previewUpdateRef = useRef(null);
  const relationshipDraftRef = useRef({ source: "", target: "", label: "关系" });
  const linksRef = useRef([]);
  const zoomRef = useRef(null);
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const dimsRef = useRef({ width: 0, height: 0 });
  const nodesRef = useRef([]);
  const sceneNovelIdRef = useRef(novel.id);
  const nodeClickRef = useRef(null);
  const relationshipClickRef = useRef(null);
  const persistNovelRef = useRef(null);
  // Survives the simulation being rebuilt (new character added, a node
  // clicked to select it, etc.) so an existing character resumes from
  // wherever it last settled instead of jumping back to a fresh formula
  // position every time. Cleared only by 重置视图.
  const nodePositionsRef = useRef(new Map());
  // Runtime lock lookup mirrors relationGraphLayout. D3 reads the set during
  // drag/force updates; completed lock changes persist normalized coordinates
  // through the novel JSON save chain.
  const lockedNodeIdsRef = useRef(new Set());
  const areaSelectStartRef = useRef(null);
  const areaSelectRectRef = useRef(null);
  // Holds a teardown for the drag-in-progress window listeners below so the
  // main effect's cleanup can detach them if it reruns/unmounts mid-drag
  // (character list changes while the user is still holding the mouse
  // button) - otherwise they'd leak, bound forever over a detached D3
  // selection from the old render.
  const areaSelectCleanupRef = useRef(null);
  // A completed area-select drag ends with a mousedown+mouseup pair that
  // (when both land on the same element, e.g. the background hit-area) the
  // browser follows with its own native "click" event on that element -
  // which used to immediately clear the selection the drag had just set,
  // making the box vanish right after being drawn. Set true the moment a
  // real drag distance is seen, consumed (and reset) by the next click
  // handler so exactly that one synthesized click is ignored.
  const suppressAreaClickRef = useRef(false);

  const [selectedId, setSelectedId] = useState(novel.characters[0]?.id);
  const [graphFocusId, setGraphFocusId] = useState("");
  const [hoverId, setHoverId] = useState("");
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const [hoverLinkKey, setHoverLinkKey] = useState("");
  const [draft, setDraft] = useState(novel.characters[0] ?? null);
  const [connectFrom, setConnectFrom] = useState("");
  const [connectTo, setConnectTo] = useState("");
  const [connectLabel, setConnectLabel] = useState("关系");
  const [selectedRelationshipId, setSelectedRelationshipId] = useState("");
  // Area-lock: Shift+drag on empty canvas draws a selection box (rendered
  // via areaSelectBox while the drag is live); on release, areaSelectedIds
  // holds the character ids that landed inside it and stays populated
  // (box still shown) until the user either right-clicks for the lock/
  // unlock menu or clears the selection some other way. areaContextMenu
  // is only ever set right after a non-empty selection is right-clicked.
  const [areaSelectBox, setAreaSelectBox] = useState(null);
  const [areaSelectedIds, setAreaSelectedIds] = useState([]);
  const [areaContextMenu, setAreaContextMenu] = useState(null);
  const [tagText, setTagText] = useState("");
  const [detailPane, setDetailPane] = useState(36);
  const [resizing, setResizing] = useState(false);
  const [deleteCharacterCandidate, setDeleteCharacterCandidate] = useState(null);
  const [confirmClearRelationship, setConfirmClearRelationship] = useState(false);
  const [pendingCharacterSwitch, setPendingCharacterSwitch] = useState(null);

  // The tag palette is persisted per-novel (`novel.characterTags`) so users
  // can curate it - delete a default tag they never use, add their own - and
  // have it stick. Before any edit (`characterTags` absent) it defaults to
  // the built-in role tags plus every tag existing characters already carry,
  // so no custom tag from old single-tag data is lost. Capped so the board
  // stays tidy.
  const tagPalette = useMemo(() => {
    if (Array.isArray(novel.characterTags)) return novel.characterTags;
    const seeded = new Set(ROLE_TAGS);
    (novel.characters ?? []).forEach((character) => getCharacterTags(character).forEach((tag) => seeded.add(tag)));
    return [...seeded];
  }, [novel.characterTags, novel.characters]);
  const draftTags = useMemo(() => getCharacterTags(draft), [draft]);
  // Show the palette plus any tag the current character has that isn't in the
  // palette (e.g. a tag someone deleted from the palette elsewhere), so it's
  // always visible and de-selectable rather than silently stuck on.
  const boardTags = useMemo(() => {
    const board = [...tagPalette];
    draftTags.forEach((tag) => {
      if (!board.includes(tag)) board.push(tag);
    });
    return board;
  }, [tagPalette, draftTags]);

  reorderTagsRef.current = (order) => {
    if (readOnly || typeof onNovelChange !== "function") return;
    onNovelChange(novel.id, { characterTags: order });
  };
  persistNovelRef.current = (patch) => {
    if (readOnly || typeof onNovelChange !== "function") return;
    onNovelChange(novel.id, patch);
  };
  nodeClickRef.current = (event, character) => selectNodeForRelationship(event, character);
  relationshipClickRef.current = (event, relationship) => selectRelationship(event, relationship);
  relationshipDraftRef.current = { source: connectFrom, target: connectTo, label: connectLabel };

  // Drag-to-reorder the tag chips, same feel as the sidebar novel drag. The ×
  // is filtered so grabbing it deletes instead of dragging; a plain click
  // (no movement) still toggles the tag. Reads the post-drop DOM order and
  // persists it as the novel's tag palette.
  useEffect(() => {
    if (readOnly || !tagBoardRef.current) return undefined;
    const sortable = Sortable.create(tagBoardRef.current, {
      animation: 180,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: "button",
      filter: ".tag-chip-remove",
      preventOnFilter: false,
      delayOnTouchOnly: true,
      delay: 120,
      touchStartThreshold: 8,
      chosenClass: "tag-sort-chosen",
      dragClass: "tag-sort-drag",
      ghostClass: "tag-sort-ghost",
      onEnd(event) {
        if (event.oldIndex === event.newIndex || event.newIndex == null) return;
        const order = Array.from(tagBoardRef.current?.querySelectorAll("button[data-tag]") ?? []).map((button) => button.dataset.tag);
        reorderTagsRef.current?.(order);
      },
    });
    return () => sortable.destroy();
  }, [readOnly, boardTags.length]);
  const draftRelationshipKey =
    connectFrom && connectTo && connectFrom !== connectTo
      ? relationshipKey({ id: selectedRelationshipId || "__preview", source: connectFrom, target: connectTo })
      : "";
  const selectedRelationship = useMemo(
    () => (novel.relationships ?? []).find((relationship) => relationship.id === selectedRelationshipId) ?? null,
    [novel.relationships, selectedRelationshipId],
  );
  const activeRelationshipKey =
    selectedRelationship
      ? draftRelationshipKey || relationshipKey(selectedRelationship)
      : "";
  const previewRelationship =
    connectFrom && connectTo && connectFrom !== connectTo && !selectedRelationshipId
      ? { id: "__preview", source: connectFrom, target: connectTo, label: connectLabel || "关系", isPreview: true }
      : null;
  const previewRelationshipKey = previewRelationship ? draftRelationshipKey : "";
  const focusId = activeRelationshipKey || previewRelationshipKey ? "" : hoverId || graphFocusId || "";
  const selected = useMemo(
    () => novel.characters.find((character) => character.id === selectedId) ?? novel.characters[0],
    [novel.characters, selectedId],
  );

  // Name/age/role/background/secret/images only ever leave `draft` via an
  // explicit 保存人物 click (color and tags commit immediately elsewhere, so
  // they never differ from `selected` and can't cause a false positive
  // here). Used to warn before switching characters throws this away.
  const isDraftDirty = useMemo(() => {
    // draft.id briefly lags selected.id for one render right after switching
    // characters (the reset effect below hasn't committed yet) - that gap is
    // not a real edit, so only compare once both sides agree on which
    // character they describe.
    if (!draft || !selected || draft.id !== selected.id) return false;
    return JSON.stringify(draft) !== JSON.stringify({ ...selected, tag: getCharacterTag(selected) });
  }, [draft, selected]);
  // The SVG node click handler is (re)bound by the D3 setup effect below,
  // which intentionally does NOT depend on selectedId/isDraftDirty (adding
  // them would tear down and rebuild the whole force-simulated graph on
  // every keystroke/selection change). That means the bound closure can be
  // stale by the time it fires - refs give it a way to read the current
  // value without needing to be in that effect's dependency list.
  const selectedIdRef = useRef(selectedId);
  const isDraftDirtyRef = useRef(isDraftDirty);
  // Same reasoning as above, for the area-lock context menu's contextmenu
  // handler (also bound once inside the D3 effect below).
  const areaSelectedIdsRef = useRef(areaSelectedIds);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    isDraftDirtyRef.current = isDraftDirty;
  }, [isDraftDirty]);
  useEffect(() => {
    areaSelectedIdsRef.current = areaSelectedIds;
  }, [areaSelectedIds]);

  useEffect(() => {
    if (!areaSelectedIds.length && !areaContextMenu) return undefined;
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismissAreaSelection();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [areaSelectedIds, areaContextMenu]);

  useEffect(() => {
    setDraft(selected ? { ...selected, tag: getCharacterTag(selected) } : null);
  }, [novel.id, selected?.id]);

  useEffect(() => {
    if (!resizing) return;
    function onMove(event) {
      const box = relationRef.current?.getBoundingClientRect();
      if (!box) return;
      const rightWidth = box.right - event.clientX;
      setDetailPane(Math.min(58, Math.max(30, (rightWidth / box.width) * 100)));
    }
    function onUp() {
      setResizing(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  useRelationGraphScene({
    novelId: novel.id,
    characters: novel.characters,
    relationships: novel.relationships,
    layout: novel.relationGraphLayout,
    color: novel.color,
    accent: novel.accent,
    resetKey: layoutResetKey,
    readOnly,
    setup: () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    if (sceneNovelIdRef.current !== novel.id) {
      nodePositionsRef.current.clear();
      sceneNovelIdRef.current = novel.id;
    }
    lockedNodeIdsRef.current = new Set(
      Object.entries(novel.relationGraphLayout?.nodes ?? {})
        .filter(([, position]) => position?.locked)
        .map(([characterId]) => characterId),
    );

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();
    const bounds = svgElement.getBoundingClientRect();
    const width = Math.max(640, bounds.width || 900);
    const height = Math.max(520, bounds.height || 620);
    dimsRef.current = { width, height };
    svg.attr("viewBox", [0, 0, width, height]);

    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", `glow-${novel.id}`).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "blur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");
    const ink = defs.append("filter").attr("id", `ink-${novel.id}`);
    ink.append("feTurbulence").attr("type", "fractalNoise").attr("baseFrequency", "0.018").attr("numOctaves", "1").attr("seed", "8").attr("result", "noise");
    ink.append("feDisplacementMap").attr("in", "SourceGraphic").attr("in2", "noise").attr("scale", "1.2");

    const hitArea = svg
      .append("rect")
      .attr("class", "graph-hit-area")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("click", (event) => {
        event.stopPropagation();
        if (suppressAreaClickRef.current) {
          suppressAreaClickRef.current = false;
          return;
        }
        clearGraphSelection();
      });

    const graphLayer = svg.append("g").attr("class", "graph-layer");

    // Area-lock selection box: lives inside graphLayer so it pans/zooms
    // with the graph exactly like a node would, using the same world
    // coordinate space (d3.pointer against graphLayer's own node already
    // accounts for both the SVG's viewBox scaling and the zoom/pan
    // transform, matching how the existing node-drag handlers get their
    // coordinates).
    const areaSelectRect = graphLayer
      .append("rect")
      .attr("class", "graph-area-select")
      .attr("rx", 0)
      .style("display", "none")
      .style("pointer-events", "none");
    areaSelectRectRef.current = areaSelectRect;

    // Bound on svg itself (an ancestor of the hit-area rect AND the node/
    // link/label layers), not just the hit-area rect: the hit-area sits
    // BEHIND the graph layer in paint order, so a Shift+drag starting on
    // top of a node (or a link, or a label) - easy to hit when nodes are
    // packed near the canvas edge - used to never reach a mousedown bound
    // only to the hit-area, silently failing to start a selection box at
    // all. Binding to svg lets the gesture start from anywhere; the node
    // drag behavior's own `.filter()` below bails out on Shift so the two
    // don't fight over the same mousedown.
    svg.on("mousedown.areaSelect", (event) => {
      // Shift+drag on every platform (Mac keyboards have Shift too, no need
      // for a separate Cmd/metaKey path).
      if (!event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const [startX, startY] = d3.pointer(event, graphLayer.node());
      areaSelectStartRef.current = { x: startX, y: startY };
      areaSelectRect.style("display", null).attr("x", startX).attr("y", startY).attr("width", 0).attr("height", 0);
      setAreaContextMenu(null);

      function onMove(moveEvent) {
        const [x, y] = d3.pointer(moveEvent, graphLayer.node());
        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        const w = Math.abs(x - startX);
        const h = Math.abs(y - startY);
        // Past a tiny threshold this is a real drag, not just a jittery
        // click - the upcoming mouseup's synthesized "click" (fired when
        // mousedown/mouseup land on the same element, regardless of how far
        // the pointer moved between them) must not be allowed to instantly
        // clear the selection this same gesture is about to set.
        if (w > 3 || h > 3) suppressAreaClickRef.current = true;
        areaSelectRect.attr("x", left).attr("y", top).attr("width", w).attr("height", h);
      }

      function onUp(upEvent) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        areaSelectCleanupRef.current = null;
        areaSelectStartRef.current = null;
        const [endX, endY] = d3.pointer(upEvent, graphLayer.node());
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        const ids = nodesRef.current.filter((character) => character.x >= minX && character.x <= maxX && character.y >= minY && character.y <= maxY).map((character) => character.id);
        if (!ids.length) {
          areaSelectRect.style("display", "none");
          setAreaSelectedIds([]);
          return;
        }
        setAreaSelectedIds(ids);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      areaSelectCleanupRef.current = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    });

    svg.on("contextmenu", (event) => {
      // Only intercepts the browser's own right-click menu when a box was
      // just drawn and landed on at least one character - a plain right-
      // click anywhere else falls through to the default menu, unchanged.
      if (!areaSelectedIdsRef.current.length) return;
      event.preventDefault();
      setAreaContextMenu({ x: event.clientX, y: event.clientY });
    });

    const links = (novel.relationships ?? []).map((relationship) => ({
      ...relationship,
      key: relationshipKey(relationship),
    }));
    // Obsidian-style ring sizing: with only a few supporting characters a
    // tight ring looks intentional, but the old fixed 150px starting radius
    // (plus a fixed 270px force target below) crammed every supporting
    // character onto the same-size ring regardless of how many there were,
    // which is what actually got messy past ~5 - not enough circumference
    // for everyone, so collision force had to fight to un-overlap them.
    // Both the starting layout and the ongoing radial pull now grow with
    // the supporting-character count instead of staying fixed.
    const nonMainCharacters = (novel.characters ?? []).filter((character) => !isMainTag(character));
    const nonMainCount = Math.max(1, nonMainCharacters.length);
    const supportRingRadius = Math.max(150, Math.min(420, 60 + nonMainCount * 34));
    // Obsidian's own graph view doesn't just count nodes - directly-linked
    // notes cluster tight, unrelated ones drift to the edge, because link
    // force naturally pulls connected nodes together. A single ring can't
    // reproduce that (it treats a character with 3 relationships to the main
    // pair the same as one with none), so layer the ring by actual graph
    // distance from the nearest main character: directly connected = close
    // ring, two hops away = the existing mid ring, three-plus hops or no
    // path at all = a far ring. This is on top of (not instead of) the link/
    // charge/collision forces below, which still do the fine-grained work.
    const closeRingRadius = Math.max(110, Math.min(230, 50 + nonMainCount * 14));
    const farRingRadius = Math.min(460, supportRingRadius + 90);
    const mainIds = new Set((novel.characters ?? []).filter(isMainTag).map((character) => character.id));
    const adjacency = new Map();
    (novel.relationships ?? []).forEach((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      if (!source || !target) return;
      if (!adjacency.has(source)) adjacency.set(source, new Set());
      if (!adjacency.has(target)) adjacency.set(target, new Set());
      adjacency.get(source).add(target);
      adjacency.get(target).add(source);
    });
    const distanceFromMain = new Map();
    const bfsQueue = [];
    mainIds.forEach((id) => {
      distanceFromMain.set(id, 0);
      bfsQueue.push(id);
    });
    while (bfsQueue.length) {
      const current = bfsQueue.shift();
      const currentDistance = distanceFromMain.get(current);
      (adjacency.get(current) ?? []).forEach((neighbor) => {
        if (distanceFromMain.has(neighbor)) return;
        distanceFromMain.set(neighbor, currentDistance + 1);
        bfsQueue.push(neighbor);
      });
    }
    function ringRadiusFor(characterId) {
      const distance = distanceFromMain.get(characterId);
      if (distance === 1) return closeRingRadius;
      if (distance === 2) return supportRingRadius;
      return farRingRadius;
    }
    let nonMainIndex = 0;
    const nodes = (novel.characters ?? []).map((character) => {
      const tag = getCharacterTag(character);
      // Resume from wherever this character last settled (survives clicks/
      // new-character-added rebuilds without visually jumping). A character
      // with no remembered position yet - first render, or just after
      // 重置视图 cleared the map - starts at dead center if it's a main
      // character, otherwise evenly spaced around its ring (true angular
      // spacing instead of an arbitrary Lissajous cos/sin pattern, so the
      // starting layout is already organized before physics runs).
      const persistedPosition = novel.relationGraphLayout?.nodes?.[character.id];
      const remembered = nodePositionsRef.current.get(character.id) ?? (
        persistedPosition
          ? { x: persistedPosition.x * width, y: persistedPosition.y * height }
          : null
      );
      const isMain = isMainTag(character);
      const ringRadius = isMain ? 0 : ringRadiusFor(character.id);
      const angle = isMain ? 0 : (nonMainIndex++ / nonMainCount) * Math.PI * 2;
      // Node size also follows Obsidian's convention that better-connected
      // nodes read as more important - a character with several relationships
      // grows a little larger than one with none, capped so the main
      // character(s) (already the visual focus via the halo) stay the
      // biggest plain circle on the star-map.
      const degree = adjacency.get(character.id)?.size ?? 0;
      const startX = remembered?.x ?? (isMain ? width / 2 : width / 2 + Math.cos(angle) * ringRadius);
      const startY = remembered?.y ?? (isMain ? height / 2 : height / 2 + Math.sin(angle) * ringRadius);
      const isLocked = Boolean(persistedPosition?.locked || lockedNodeIdsRef.current.has(character.id));
      if (isLocked) lockedNodeIdsRef.current.add(character.id);
      return {
        ...character,
        tag,
        labelWidth: Math.max(54, tag.length * 12 + 24),
        radius: isMain ? 28 + Math.min(degree, 5) * 1.2 : 21 + Math.min(degree, 6) * 1.6,
        ringRadius,
        x: startX,
        y: startY,
        // Area-lock: pin fx/fy the same way an active user-drag does, so
        // every force in the simulation (including the ones a newly added
        // character's charge/collision would otherwise apply) simply
        // cannot move this node - not just "resume from remembered
        // position" like every other node, which is still subject to
        // resettling on each rebuild.
        ...(isLocked ? { fx: startX, fy: startY } : {}),
      };
    });
    linksRef.current = links;

    const zoom = d3
      .zoom()
      .scaleExtent([0.45, 2.8])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.button) return false;
        // Shift+drag on empty canvas draws an area-lock selection box
        // instead of panning - plain drag (no Shift) is completely
        // untouched, still pans exactly as before.
        if (event.shiftKey) return false;
        return !event.target?.closest?.(".graph-node");
      })
      .on("zoom", (event) => {
        zoomTransformRef.current = event.transform;
        graphLayer.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom).on("dblclick.zoom", null);
    svg.call(zoom.transform, zoomTransformRef.current);

    const link = graphLayer
      .append("g")
      .attr("class", "graph-links")
      .selectAll("path")
      .data(links)
      .join("path")
      // Ordinary line color is fixed (not tinted by novel.color) - user
      // preference, only the main-pair line is meaningful color here.
      .attr("stroke", (relationship) =>
        isMainPairRelationship(relationship, nodes, getNodeId) ? MAIN_PAIR_RELATION_COLOR : relationship.isPreview ? "#7E9A9A" : "#8BA09C",
      )
      .attr("stroke-width", (relationship) => (relationship.isPreview ? 2.2 : isCoreRelationship(relationship, nodes) ? 1.7 : 1.25))
      .attr("stroke-dasharray", (relationship) => (relationship.isPreview ? "3 5" : "5 7"))
      .attr("stroke-opacity", (relationship) => (relationship.isPreview ? 0.82 : 0.48))
      .attr("fill", "none")
      .attr("filter", `url(#ink-${novel.id})`)
      .on("mouseenter", (_, relationship) => setHoverLinkKey(relationship.key))
      .on("mouseleave", () => setHoverLinkKey(""))
      .on("click", (event, relationship) => relationshipClickRef.current?.(event, relationship));

    const label = graphLayer
      .append("g")
      .attr("class", "graph-link-labels")
      .selectAll("g")
      .data(links)
      .join("g")
      .attr("opacity", (relationship) =>
        relationship.key === activeRelationshipKey || relationship.key === previewRelationshipKey ? 1 : 0,
      )
      .on("mouseenter", (_, relationship) => setHoverLinkKey(relationship.key))
      .on("mouseleave", () => setHoverLinkKey(""))
      .on("click", (event, relationship) => relationshipClickRef.current?.(event, relationship));

    label
      .append("rect")
      .attr("x", (relationship) => -Math.max(38, String(relationship.label).length * 13) / 2)
      .attr("y", -12)
      .attr("width", (relationship) => Math.max(38, String(relationship.label).length * 13))
      .attr("height", 24)
      .attr("rx", 12);
    label.append("text").text((relationship) => relationship.label).attr("text-anchor", "middle").attr("dy", "0.34em");

    const previewLayer = graphLayer.append("g").attr("class", "graph-relationship-preview").style("display", "none");
    const previewPath = previewLayer
      .append("path")
      .attr("class", "graph-link-preview")
      .attr("fill", "none")
      .attr("stroke", "#7E9A9A")
      .attr("stroke-width", 2.2)
      .attr("stroke-dasharray", "3 5");
    const previewLabel = previewLayer.append("g").attr("class", "graph-link-preview-label");
    previewLabel.append("rect").attr("height", 24).attr("y", -12).attr("rx", 12);
    previewLabel.append("text").attr("text-anchor", "middle").attr("dy", "0.34em");

    function updateRelationshipPreview() {
      const relationshipDraft = relationshipDraftRef.current;
      const source = nodesRef.current.find((node) => node.id === relationshipDraft.source);
      const target = nodesRef.current.find((node) => node.id === relationshipDraft.target);
      if (!source || !target || source.id === target.id) {
        previewLayer.style("display", "none");
        return;
      }
      const labelText = relationshipDraft.label || "关系";
      const labelWidth = Math.max(38, String(labelText).length * 13);
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2 - 10;
      const angle = (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI;
      const safeAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
      previewLayer.style("display", null);
      previewPath.attr("d", organicLinkPath({ source, target }, 0, 0));
      previewLabel.attr("transform", `translate(${mx},${my}) rotate(${safeAngle})`);
      previewLabel.select("rect").attr("x", -labelWidth / 2).attr("width", labelWidth);
      previewLabel.select("text").text(labelText);
    }
    previewUpdateRef.current = updateRelationshipPreview;

    const simulation = d3
      .forceSimulation(nodes)
      .velocityDecay(0.58)
      .alphaDecay(0.065)
      .alphaMin(0.003)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((character) => character.id)
          .distance((relationship) => (isCoreRelationship(relationship, nodes) ? 154 : 215))
          .strength((relationship) => (isCoreRelationship(relationship, nodes) ? 0.32 : 0.16)),
      )
      .force("charge", d3.forceManyBody().strength((character) => (isMainTag(character) ? -700 : -470)))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.018))
      // Main character(s) settle on a near-zero-radius ring (practically dead
      // center) instead of the old 130px orbit; everyone else is pulled
      // toward their own ringRadius - close/mid/far depending on graph
      // distance from a main character (see above) - instead of one shared
      // distance every node competed for regardless of how related they are.
      .force("radial", d3.forceRadial((character) => (isMainTag(character) ? 20 : character.ringRadius), width / 2, height / 2).strength((character) => (isMainTag(character) ? 0.12 : 0.05)))
      .force("collision", d3.forceCollide().radius((character) => Math.max(character.radius + 82, character.labelWidth / 2 + 44)).strength(0.96))
      .force("x", d3.forceX(width / 2).strength((character) => (isMainTag(character) ? 0.05 : 0.01)))
      .force("y", d3.forceY(height / 2).strength((character) => (isMainTag(character) ? 0.05 : 0.01)));

    const node = graphLayer
      .append("g")
      .attr("class", "graph-nodes")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .attr("data-character-id", (character) => character.id)
      .style("cursor", "grab")
      .on("mouseenter", (_, character) => setHoverId(character.id))
      .on("mouseleave", () => setHoverId(""))
      .on("click", (event, character) => {
        if (suppressAreaClickRef.current) {
          suppressAreaClickRef.current = false;
          return;
        }
        nodeClickRef.current?.(event, character);
        focusNode(svg, zoom, width, height, character);
      })
      .call(
        d3
          .drag()
          .container(graphLayer.node())
          // Shift+mousedown on a node must start an area-select box (see the
          // svg-level mousedown handler above), not drag that one node - the
          // default filter only excludes ctrl/secondary-button, so Shift was
          // previously left to fall through and move the node instead.
          .filter((event) => !event.shiftKey && !event.ctrlKey && !event.button)
          .on("start", (event) => {
            event.sourceEvent?.stopPropagation();
            d3.select(event.sourceEvent?.target?.closest?.(".graph-node")).style("cursor", "grabbing");
            if (!event.active) simulation.alphaTarget(0.02).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.sourceEvent?.stopPropagation();
            event.subject.fx = event.x;
            event.subject.fy = event.y;
            nodePositionsRef.current.set(event.subject.id, { x: event.x, y: event.y });
          })
          .on("end", (event) => {
            event.sourceEvent?.stopPropagation();
            if (!event.active) simulation.alphaTarget(0);
            nodePositionsRef.current.set(event.subject.id, { x: event.subject.x, y: event.subject.y });
            if (!readOnly) {
              persistNovelRef.current?.({
                relationGraphLayout: updateGraphLayoutNode(novel.relationGraphLayout, event.subject.id, {
                  x: event.subject.x / width,
                  y: event.subject.y / height,
                  locked: lockedNodeIdsRef.current.has(event.subject.id),
                }),
              });
            }
            // A locked node stays locked through a manual re-drag too - only
            // clear fx/fy (letting physics move it again) if it wasn't in
            // the locked set to begin with, otherwise every drag's own end
            // handler would silently undo 锁定位置.
            if (!lockedNodeIdsRef.current.has(event.subject.id)) {
              event.subject.fx = null;
              event.subject.fy = null;
            }
            d3.select(event.sourceEvent?.target?.closest?.(".graph-node")).style("cursor", "grab");
          }),
      );

    // Area-lock indicator: a subtle square-cornered (no border-radius,
    // distinct from every other rounded shape in this graph on purpose -
    // reads as "pinned in place", not another halo) dashed grey outline
    // around a locked character, drawn behind the halo. Visibility is
    // re-toggled directly (no rebuild needed) by lockSelectedArea/
    // unlockSelectedArea via nodeSelectionRef, so this only needs to be
    // right at creation/rebuild time.
    node
      .append("rect")
      .attr("class", "node-lock-ring")
      .attr("x", (character) => -(character.radius + 17))
      .attr("y", (character) => -(character.radius + 17))
      .attr("width", (character) => (character.radius + 17) * 2)
      .attr("height", (character) => (character.radius + 17) * 2)
      .attr("rx", 0)
      .style("display", (character) => (lockedNodeIdsRef.current.has(character.id) ? null : "none"));

    // Halo colors are fixed, not tinted by novel.color. The main-character
    // halo stays warm two-tone, but the red/yellow are close enough in value
    // to read as one soft emphasis instead of two clashing rings.
    node
      .append("circle")
      .attr("r", (character) => character.radius + (isMainTag(character) ? 21 : 12))
      .attr("fill", (character) => (isMainTag(character) ? "rgba(217,112,91,0.34)" : "#8BA09C"))
      .attr("stroke", (character) => (isMainTag(character) ? "rgba(244,199,112,0.72)" : "none"))
      .attr("stroke-width", (character) => (isMainTag(character) ? 8 : 0))
      .attr("opacity", (character) => (isMainTag(character) ? 0.52 : 0.1))
      .attr("class", (character) => `planet-halo ${isMainTag(character) ? "is-celestial" : ""}`);
    node
      .append("circle")
      .attr("class", "node-core")
      .attr("r", (character) => character.radius)
      .attr("fill", (character, index) => character.color ?? d3.interpolateRgb(novel.color, novel.accent)(index / Math.max(1, nodes.length - 1)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("filter", `url(#glow-${novel.id})`);

    const tagGroup = node.append("g").attr("class", "node-floating-tag");
    tagGroup
      .append("rect")
      .attr("x", (character) => -character.labelWidth / 2)
      .attr("y", (character) => -character.radius - 48)
      .attr("width", (character) => character.labelWidth)
      .attr("height", 20)
      .attr("rx", 10);
    tagGroup
      .append("text")
      .text((character) => character.tag)
      .attr("text-anchor", "middle")
      .attr("y", (character) => -character.radius - 34)
      .attr("fill", "#6C5D52")
      .attr("font-size", 10)
      .attr("font-weight", 800);

    node.append("text").text((character) => character.name.slice(0, 1)).attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "#fff").attr("font-size", 13).attr("font-weight", 800);
    node.append("text").text((character) => character.name).attr("text-anchor", "middle").attr("y", (character) => character.radius + 27).attr("fill", "#3D3731").attr("font-size", 13).attr("font-weight", 800);
    node.append("text").text((character) => character.role).attr("text-anchor", "middle").attr("y", (character) => character.radius + 46).attr("fill", "#8D7A6B").attr("font-size", 11);

    simulation.on("tick", () => {
      nodes.forEach((character) => {
        const padX = character.labelWidth / 2 + 18;
        const padTop = character.radius + 58;
        character.x = Math.max(padX, Math.min(width - padX, character.x));
        character.y = Math.max(padTop, Math.min(height - 72, character.y));
        nodePositionsRef.current.set(character.id, { x: character.x, y: character.y });
      });
      link.attr("d", (relationship, index) => organicLinkPath(relationship, index, simulation.alpha()));
      label.attr("transform", (relationship) => {
        const sx = relationship.source.x;
        const sy = relationship.source.y;
        const tx = relationship.target.x;
        const ty = relationship.target.y;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2 - 10;
        const angle = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
        const safeAngle = angle > 90 || angle < -90 ? angle + 180 : angle;
        return `translate(${mx},${my}) rotate(${safeAngle})`;
      });
      node.attr("transform", (character) => `translate(${character.x},${character.y})`);
      updateRelationshipPreview();
    });

    nodeSelectionRef.current = node;
    linkSelectionRef.current = link;
    labelSelectionRef.current = label;
    nodesRef.current = nodes;
    return () => {
      simulation.stop();
      areaSelectCleanupRef.current?.();
      areaSelectCleanupRef.current = null;
      previewUpdateRef.current = null;
    };
    },
  });

  useEffect(() => {
    previewUpdateRef.current?.();
  }, [connectFrom, connectTo, connectLabel, selectedRelationshipId]);

  useEffect(() => {
    const label = labelSelectionRef.current;
    if (!label || !connectFrom || !connectTo || connectFrom === connectTo) return;

    const nextLabel = connectLabel || "关系";
    label.each((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      const isSamePair = (source === connectFrom && target === connectTo) || (source === connectTo && target === connectFrom);
      const isSelectedEdge = selectedRelationshipId && relationship.id === selectedRelationshipId;
      const isPreviewEdge = !selectedRelationshipId && relationship.isPreview && isSamePair;
      if (isSelectedEdge || isPreviewEdge) relationship.label = nextLabel;
    });

    label
      .select("rect")
      .attr("x", (relationship) => -Math.max(38, String(relationship.label).length * 13) / 2)
      .attr("width", (relationship) => Math.max(38, String(relationship.label).length * 13));
    label.select("text").text((relationship) => relationship.label);
  }, [connectLabel, connectFrom, connectTo, selectedRelationshipId]);

  useEffect(() => {
    const node = nodeSelectionRef.current;
    const link = linkSelectionRef.current;
    const label = labelSelectionRef.current;
    if (!node || !link || !label) return;

    const edgeFocusKey = activeRelationshipKey || previewRelationshipKey || hoverLinkKey;
    const focus = getFocusSets(linksRef.current, focusId, edgeFocusKey);
    if (connectFrom && connectTo && connectFrom !== connectTo) {
      focus.nodeIds.add(connectFrom);
      focus.nodeIds.add(connectTo);
    }
    const hasFocus = Boolean(focusId || edgeFocusKey);
    node
      .classed("is-selected", (character) => character.id === graphFocusId)
      .classed("is-dimmed", (character) => hasFocus && !focus.nodeIds.has(character.id))
      .transition()
      .duration(160)
      .attr("opacity", (character) => (hasFocus ? (focus.nodeIds.has(character.id) ? 1 : 0.15) : 1));
    // Relationship lines intentionally keep the same color/opacity/width
    // before and after selection or hover (user preference) - the only line
    // color distinction in this graph is the fixed main-pair red, set once
    // at link creation and never touched here. Only the label text's
    // visibility follows focus.
    label.transition().duration(160).attr("opacity", (relationship) => (focus.linkKeys.has(relationship.key) ? 1 : 0));
  }, [focusId, hoverLinkKey, graphFocusId, activeRelationshipKey, previewRelationshipKey, connectFrom, connectTo, connectLabel]);

  function handleAddCharacter() {
    if (readOnly) return;
    if (isDraftDirty) {
      setPendingCharacterSwitch(() => createAndSelectCharacter);
      return;
    }
    createAndSelectCharacter();
  }

  function createAndSelectCharacter() {
    const character = emptyCharacter(novel.id);
    onAddCharacter(novel.id, character);
    setSelectedId(character.id);
    setGraphFocusId(character.id);
  }

  function focusSelectedNodeView() {
    const svgElement = svgRef.current;
    const zoom = zoomRef.current;
    const { width, height } = dimsRef.current;
    const node = nodesRef.current.find((character) => character.id === selectedId);
    if (!svgElement || !zoom || !node) return;
    focusNode(d3.select(svgElement), zoom, width, height, node);
  }

  function resetGraphView() {
    const svgElement = svgRef.current;
    const zoom = zoomRef.current;
    if (!svgElement || !zoom) return;
    // Set this BEFORE starting the animated transition below, not after -
    // setLayoutResetKey triggers the graph-rebuild effect on the next
    // render (near-immediately), which reapplies whatever
    // zoomTransformRef.current holds via `svg.call(zoom.transform, ...)`.
    // The transition's own "zoom" event only updates that ref
    // progressively as it animates over 520ms, so the rebuild used to run
    // long before the ref caught up to identity - it would reapply the
    // stale pre-reset zoom level, so 重置视图 visually reset node
    // positions but not the zoom scale ("大小"). Setting it synchronously
    // here means the rebuild always sees the correct target regardless of
    // how far the transition has actually animated.
    zoomTransformRef.current = d3.zoomIdentity;
    d3.select(svgElement).transition().duration(520).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity);
    // Drop every remembered position so the rebuild this triggers puts the
    // main character(s) back at dead center instead of resuming wherever
    // they'd drifted to - the one thing 重置视图 is supposed to restore.
    nodePositionsRef.current.clear();
    // 重置视图 is a full reset back to the best-fit default view - locked
    // nodes surviving it would mean the "reset" silently keeps pinning
    // some characters at their just-cleared old spot, which isn't a real
    // reset at all.
    lockedNodeIdsRef.current.clear();
    if (!readOnly && typeof onNovelChange === "function") {
      onNovelChange(novel.id, { relationGraphLayout: { version: 1, nodes: {} } });
    }
    setAreaSelectedIds([]);
    setAreaContextMenu(null);
    setLayoutResetKey((current) => current + 1);
  }

  function dismissAreaSelection() {
    areaSelectRectRef.current?.style("display", "none");
    setAreaSelectedIds([]);
    setAreaContextMenu(null);
  }

  function lockSelectedArea() {
    const ids = areaSelectedIdsRef.current;
    if (!ids.length) return;
    ids.forEach((id) => lockedNodeIdsRef.current.add(id));
    nodesRef.current.forEach((character) => {
      if (!ids.includes(character.id)) return;
      character.fx = character.x;
      character.fy = character.y;
    });
    if (!readOnly && typeof onNovelChange === "function") {
      const relationGraphLayout = ids.reduce((layout, id) => {
        const character = nodesRef.current.find((node) => node.id === id);
        if (!character) return layout;
        return updateGraphLayoutNode(layout, id, {
          x: character.x / dimsRef.current.width,
          y: character.y / dimsRef.current.height,
          locked: true,
        });
      }, novel.relationGraphLayout);
      onNovelChange(novel.id, { relationGraphLayout });
    }
    nodeSelectionRef.current
      ?.select(".node-lock-ring")
      .style("display", (character) => (lockedNodeIdsRef.current.has(character.id) ? null : "none"));
    dismissAreaSelection();
  }

  function unlockSelectedArea() {
    const ids = areaSelectedIdsRef.current;
    if (!ids.length) return;
    // Ignore ids that were never locked to begin with - a no-op for those,
    // per spec, not an error.
    ids.forEach((id) => lockedNodeIdsRef.current.delete(id));
    nodesRef.current.forEach((character) => {
      if (!ids.includes(character.id)) return;
      character.fx = null;
      character.fy = null;
    });
    if (!readOnly && typeof onNovelChange === "function") {
      const relationGraphLayout = ids.reduce((layout, id) => updateGraphLayoutNode(layout, id, { locked: false }), novel.relationGraphLayout);
      onNovelChange(novel.id, { relationGraphLayout });
    }
    nodeSelectionRef.current
      ?.select(".node-lock-ring")
      .style("display", (character) => (lockedNodeIdsRef.current.has(character.id) ? null : "none"));
    dismissAreaSelection();
  }

  function handleSaveCharacter() {
    if (!draft || readOnly) return;
    onUpdateCharacter(novel.id, draft.id, draft);
  }

  function updateDraftFocusPages(key, pages, { isStructural = true } = {}) {
    if (!draft || readOnly) return;
    const nextFocusPages = patchFocusPageMap(draft.focusPages, key, pages);
    setDraft((current) => (current ? { ...current, focusPages: nextFocusPages } : current));
    // Structural changes (add/rename/reorder/delete a 小标题) must reach
    // Supabase right away, not sit gated behind the separate "保存人物"
    // button - the delete confirmation copy already promises this ("并同步
    // 到云端保存"). Plain typing inside a page is NOT structural (found
    // 2026-07-09: FocusTextarea used to report every keystroke through this
    // same callback, so typing silently bypassed 保存人物 and re-saved the
    // whole character on every character typed) - it only updates `draft`
    // above, same as every other field on this form, until an explicit
    // save. Persisted against `selected` (the last-saved character), not
    // the full `draft`, so an in-progress unsaved text edit elsewhere on
    // the form isn't force-committed as a side effect.
    if (isStructural && selected) onUpdateCharacter(novel.id, selected.id, { focusPages: nextFocusPages });
  }

  function requestDeleteCharacter() {
    if (!draft || readOnly) return;
    setDeleteCharacterCandidate(draft);
  }

  function confirmDeleteCharacter() {
    if (!deleteCharacterCandidate) return;
    const remainingCharacters = novel.characters.filter((character) => character.id !== deleteCharacterCandidate.id);
    const nextCharacter = remainingCharacters[0] ?? null;
    lockedNodeIdsRef.current.delete(deleteCharacterCandidate.id);
    nodePositionsRef.current.delete(deleteCharacterCandidate.id);
    setAreaSelectedIds((current) => current.filter((id) => id !== deleteCharacterCandidate.id));
    onDeleteCharacter?.(novel.id, deleteCharacterCandidate.id);
    clearRelationshipSelection();
    setDeleteCharacterCandidate(null);
    setSelectedId(nextCharacter?.id);
    setGraphFocusId(nextCharacter?.id ?? "");
    setDraft(nextCharacter ? { ...nextCharacter, tag: getCharacterTag(nextCharacter) } : null);
  }

  function handleAddRelationship() {
    if (readOnly) return;
    if (!connectFrom || !connectTo || connectFrom === connectTo) return;
    const relationship = { source: connectFrom, target: connectTo, label: connectLabel || "关系" };
    if (selectedRelationshipId) {
      onUpdateRelationship(novel.id, selectedRelationshipId, relationship);
      setHoverLinkKey(relationshipKey({ ...relationship, id: selectedRelationshipId }));
    } else {
      const id = createNewRelationshipId();
      onAddRelationship(novel.id, { ...relationship, id });
      setSelectedRelationshipId(id);
      setHoverLinkKey(relationshipKey({ ...relationship, id }));
    }
  }

  function selectRelationship(event, relationship) {
    event.stopPropagation();
    const sourceId = getNodeId(relationship.source);
    const applySelection = () => {
      setSelectedId(sourceId);
      setGraphFocusId(sourceId);
      setSelectedRelationshipId(relationship.id);
      setConnectFrom(sourceId);
      setConnectTo(getNodeId(relationship.target));
      setConnectLabel(relationship.label || "关系");
      setHoverLinkKey(relationship.key);
    };
    if (sourceId !== selectedIdRef.current && isDraftDirtyRef.current) {
      setPendingCharacterSwitch(() => applySelection);
      return;
    }
    applySelection();
  }

  function selectNodeForRelationship(event, character) {
    event.stopPropagation();
    const isChoosingTarget = Boolean(connectFrom && !connectTo && connectFrom !== character.id);
    if (!isChoosingTarget && character.id !== selectedIdRef.current && isDraftDirtyRef.current) {
      setPendingCharacterSwitch(() => () => applyNodeSelection(character));
      return;
    }
    applyNodeSelection(character);
  }

  function applyNodeSelection(character) {
    if (readOnly) {
      setSelectedId(character.id);
      setGraphFocusId(character.id);
      character.fx = character.x;
      character.fy = character.y;
      window.setTimeout(() => {
        character.fx = null;
        character.fy = null;
      }, 900);
      return;
    }

    if (connectFrom && !connectTo && connectFrom !== character.id) {
      selectRelationshipBetween(connectFrom, character.id);
    } else {
      setSelectedId(character.id);
      setGraphFocusId(character.id);
      setSelectedRelationshipId("");
      setConnectFrom(character.id);
      setConnectTo("");
      setConnectLabel("关系");
      setHoverLinkKey("");
    }
  }

  function selectRelationshipBetween(sourceId, targetId) {
    const relationship = (novel.relationships ?? []).find((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      return (source === sourceId && target === targetId) || (source === targetId && target === sourceId);
    });

    setConnectFrom(sourceId);
    setConnectTo(targetId);
    if (relationship) {
      setSelectedRelationshipId(relationship.id);
      setConnectFrom(getNodeId(relationship.source));
      setConnectTo(getNodeId(relationship.target));
      setConnectLabel(relationship.label || "");
      setHoverLinkKey(relationshipKey(relationship));
    } else {
      setSelectedRelationshipId("");
      setConnectLabel("");
      setHoverLinkKey("");
    }
  }

  function updateRelationshipDraft(patch) {
    if (readOnly) return;
    const next = { source: connectFrom, target: connectTo, label: connectLabel, ...patch };
    setConnectFrom(next.source);
    setConnectTo(next.target);
    setConnectLabel(next.label);
    if (!selectedRelationshipId && next.source && next.target && next.source !== next.target) {
      const existing = findRelationship(next.source, next.target);
      if (existing) {
        setSelectedRelationshipId(existing.id);
        setConnectLabel(existing.label || next.label || "");
        setHoverLinkKey(relationshipKey(existing));
        return;
      }
    }
  }

  function findRelationship(sourceId, targetId) {
    return (novel.relationships ?? []).find((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      return (source === sourceId && target === targetId) || (source === targetId && target === sourceId);
    });
  }

  function clearRelationshipSelection() {
    setSelectedRelationshipId("");
    setConnectFrom("");
    setConnectTo("");
    setConnectLabel("关系");
    setHoverLinkKey("");
    setConfirmClearRelationship(false);
  }

  function clearSelectedRelationship() {
    if (selectedRelationshipId) {
      onDeleteRelationship?.(novel.id, selectedRelationshipId);
    }
    clearRelationshipSelection();
  }

  function clearGraphSelection() {
    setGraphFocusId("");
    setHoverId("");
    clearRelationshipSelection();
    dismissAreaSelection();
  }

  function toggleSelectedNodeLock() {
    if (!selectedId || readOnly) return;
    const node = nodesRef.current.find((character) => character.id === selectedId);
    const currentlyLocked = lockedNodeIdsRef.current.has(selectedId);
    if (currentlyLocked) {
      lockedNodeIdsRef.current.delete(selectedId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    } else {
      lockedNodeIdsRef.current.add(selectedId);
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
      }
    }
    nodeSelectionRef.current
      ?.select(".node-lock-ring")
      .style("display", (character) => (lockedNodeIdsRef.current.has(character.id) ? null : "none"));
    const { width, height } = dimsRef.current;
    const persisted = novel.relationGraphLayout?.nodes?.[selectedId];
    onNovelChange?.(novel.id, {
      relationGraphLayout: updateGraphLayoutNode(novel.relationGraphLayout, selectedId, {
        x: node && width ? node.x / width : persisted?.x ?? 0.5,
        y: node && height ? node.y / height : persisted?.y ?? 0.5,
        locked: !currentlyLocked,
      }),
    });
  }

  // Multi-select: a character can carry several tags. `tags` is the source of
  // truth; `tag` is kept as the derived primary (a main-character tag wins,
  // else the first) so the graph node label and main-character detection -
  // which both read `character.tag` - keep working unchanged.
  function assignCharacterTags(nextTags) {
    if (!draft || readOnly) return;
    const nextDraft = { ...draft, tags: nextTags, tag: derivePrimaryTag(nextTags) };
    setDraft(nextDraft);
    onUpdateCharacter(novel.id, nextDraft.id, { tags: nextDraft.tags, tag: nextDraft.tag });
  }

  function toggleTag(tag) {
    if (!draft || readOnly) return;
    const current = getCharacterTags(draft);
    assignCharacterTags(current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function persistTagPalette(nextPalette) {
    if (readOnly || typeof onNovelChange !== "function") return;
    onNovelChange(novel.id, { characterTags: nextPalette });
  }

  function addTag() {
    if (readOnly) return;
    const nextTag = tagText.trim();
    if (!nextTag) return;
    if (!tagPalette.includes(nextTag) && tagPalette.length < 12) {
      persistTagPalette([...tagPalette, nextTag]);
    }
    const current = getCharacterTags(draft);
    if (!current.includes(nextTag)) assignCharacterTags([...current, nextTag]);
    setTagText("");
  }

  // The × on a chip deletes the tag from the novel's palette entirely (works
  // for default role tags too now, not just custom ones - the palette is
  // materialized and persisted on first edit) AND strips it from every
  // character that carries it - including characters still on the implicit
  // single-tag fallback (`tags` null, only `tag` set). Without the
  // per-character strip, a deleted tag reappeared as an "extra" chip the
  // moment you opened a character whose primary tag was the deleted one.
  function removeTagFromPalette(tag, event) {
    event.stopPropagation();
    if (readOnly || typeof onNovelChange !== "function") return;
    const nextPalette = tagPalette.filter((item) => item !== tag);
    const nextCharacters = (novel.characters ?? []).map((character) => {
      const tags = getCharacterTags(character);
      if (!tags.includes(tag)) return character;
      const remaining = tags.filter((item) => item !== tag);
      return { ...character, tags: remaining, tag: derivePrimaryTag(remaining) };
    });
    onNovelChange(novel.id, { characterTags: nextPalette, characters: nextCharacters });
    // Sync the open draft immediately so the board reflects the delete before
    // the novel-characters update round-trips back through the select effect.
    const draftTagsNow = getCharacterTags(draft);
    if (draftTagsNow.includes(tag)) {
      const remaining = draftTagsNow.filter((item) => item !== tag);
      setDraft((current) => mergeCharacterDraft(current, { tags: remaining, tag: derivePrimaryTag(remaining) }));
    }
  }

  function chooseNodeColor(color) {
    if (!draft || readOnly) return;
    setDraft((current) => mergeCharacterDraft(current, { color }));
    onUpdateCharacter(novel.id, draft.id, { color });
  }

  return (
    <div
      ref={relationRef}
      className={`relation-layout is-resizable ${!showGraph ? "has-no-graph" : ""} ${!showDetails ? "has-no-details" : ""}`}
      style={{ "--detail-pane": `${detailPane}%` }}
    >
      {showGraph && (
        <div className="graph-card relation-graph" data-tour="relation-graph">
          <div className="graph-toolbar">
            <div>
              <p className="eyebrow">Relation graph</p>
              <h3>动感人物关系星图</h3>
            </div>
            <div className="toolbar-actions">
              {!readOnly && (
                <button type="button" onClick={handleAddCharacter}>
                  <Plus size={16} />
                  新增人物
                </button>
              )}
              <button type="button" onClick={focusSelectedNodeView}>
                <ZoomIn size={16} />
                聚焦
              </button>
              <button type="button" className="relation-reset-button" onClick={resetGraphView}>
                <RotateCcw size={16} />
                重置视图
              </button>
            </div>
          </div>
          <svg ref={svgRef} className="relation-svg" aria-label={`${novel.title} 人物关系图谱`} />
          <div className="graph-hint">
            {showDetails
              ? "在右侧“编辑关系”处可随时输入或修改羁绊描述；拖动中间细线可调整星图和人物详情占比。"
              : "拖动星球可查看人物关系；聚焦和重置用于整理星图视野。"}
          </div>
        </div>
      )}

      {showGraph && showDetails && (
        <div className="relation-split-handle" onMouseDown={() => setResizing(true)} role="separator" aria-orientation="vertical" aria-label="调整星图和人物详情宽度" />
      )}
      {showDetails && (
        <CharacterInspector
          novel={novel}
          draft={draft}
          readOnly={readOnly}
          character={{
            colors: NODE_COLORS,
            locked: Boolean(novel.relationGraphLayout?.nodes?.[selectedId]?.locked),
            patch: (patch) => setDraft((current) => mergeCharacterDraft(current, patch)),
            chooseColor: chooseNodeColor,
            updateFocusPages: updateDraftFocusPages,
            save: handleSaveCharacter,
            requestDelete: requestDeleteCharacter,
            toggleLock: toggleSelectedNodeLock,
          }}
          tags={{
            boardRef: tagBoardRef,
            available: boardTags,
            selected: draftTags,
            text: tagText,
            setText: setTagText,
            paletteSize: tagPalette.length,
            toggle: toggleTag,
            add: addTag,
            remove: removeTagFromPalette,
          }}
          relationship={{
            id: selectedRelationshipId,
            source: connectFrom,
            target: connectTo,
            label: connectLabel,
            patch: updateRelationshipDraft,
            save: handleAddRelationship,
            requestClear: () => setConfirmClearRelationship(true),
          }}
        />
      )}
      {areaContextMenu &&
        createPortal(
          <>
            <div className="graph-area-menu-backdrop" role="presentation" onMouseDown={dismissAreaSelection} onContextMenu={(event) => event.preventDefault()} />
            <div
              className="graph-area-menu"
              role="menu"
              style={{ left: areaContextMenu.x, top: areaContextMenu.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button type="button" role="menuitem" onClick={lockSelectedArea}>
                锁定位置
              </button>
              <button type="button" role="menuitem" onClick={unlockSelectedArea}>
                取消锁定
              </button>
            </div>
          </>,
          document.body,
        )}
      {pendingCharacterSwitch &&
        createPortal(
          <div className="modal-backdrop relation-confirm-backdrop" role="presentation" onMouseDown={() => setPendingCharacterSwitch(null)}>
            <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-character-title" onMouseDown={(event) => event.stopPropagation()}>
              <p className="eyebrow">Unsaved changes</p>
              <h2 id="unsaved-character-title">当前人物有未保存的修改</h2>
              <p>切换到另一个人物会丢失“{draft?.name ?? "当前人物"}”尚未点击“保存人物”的修改。是否放弃这些修改并切换？</p>
              <div className="confirm-actions">
                <button type="button" className="ghost-button" onClick={() => setPendingCharacterSwitch(null)}>
                  取消，留在这里
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    const proceed = pendingCharacterSwitch;
                    setPendingCharacterSwitch(null);
                    proceed();
                  }}
                >
                  放弃修改并切换
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
      {deleteCharacterCandidate &&
        createPortal(
        <div className="modal-backdrop relation-confirm-backdrop" role="presentation" onMouseDown={() => setDeleteCharacterCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-character-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Delete character</p>
            <h2 id="delete-character-title">是否确定删除该人物？</h2>
            <p>该操作将永久删除“{deleteCharacterCandidate.name}”的人物卡片，并同步清空与此人物相关的所有关系连线。</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteCharacterCandidate(null)}>
                取消
              </button>
              <button type="button" className="danger-button" onClick={confirmDeleteCharacter}>
                确定删除
              </button>
            </div>
          </section>
        </div>,
          document.body,
        )}
      {confirmClearRelationship &&
        createPortal(
          <div className="modal-backdrop relation-confirm-backdrop" role="presentation" onMouseDown={() => setConfirmClearRelationship(false)}>
            <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="clear-relation-title" onMouseDown={(event) => event.stopPropagation()}>
              <p className="eyebrow">Clear selected relation</p>
              <h2 id="clear-relation-title">清空所选关系？</h2>
              <p>
                {selectedRelationshipId
                  ? "这会删除当前选中的关系线，并清空右侧正在编辑的起点、终点和羁绊描述。"
                  : "当前没有选中已保存的关系线，只会清空右侧正在编辑的起点、终点和羁绊描述。"}
              </p>
              <div className="confirm-actions">
                <button type="button" className="ghost-button" onClick={() => setConfirmClearRelationship(false)}>
                  取消
                </button>
                <button type="button" className="danger-button" onClick={clearSelectedRelationship}>
                  确定清空
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}

// The full tag set for a character. New multi-select data stores `tags`;
// older single-tag data (or a character that never had its tag touched)
// falls back to its one derived tag, so every existing character keeps
// exactly the tag it showed before.
function getCharacterTags(character) {
  if (Array.isArray(character?.tags)) return character.tags;
  const single = getCharacterRelationTag(character);
  return single ? [single] : [];
}

// The primary tag drives the graph node label and main-character detection
// (both read `character.tag`). A main-character tag among the selection wins
// so a character tagged e.g. both 主角1 and 亲友 still reads as a lead.
function derivePrimaryTag(tags) {
  return tags.find((tag) => isMainCharacter({ tag })) ?? tags[0] ?? "主要配角";
}

function getCharacterTag(character) {
  return getCharacterRelationTag(character);
}

function isMainTag(character) {
  return isMainCharacter(character);
}

function getNodeId(node) {
  return typeof node === "object" ? node.id : node;
}

function relationshipKey(relationship) {
  return relationship.id || `${getNodeId(relationship.source)}-${getNodeId(relationship.target)}`;
}

function getFocusSets(links, focusId, hoverLinkKey) {
  const nodeIds = new Set();
  const linkKeys = new Set();
  if (focusId) nodeIds.add(focusId);
  links.forEach((relationship) => {
    const source = getNodeId(relationship.source);
    const target = getNodeId(relationship.target);
    if (hoverLinkKey && relationship.key === hoverLinkKey) {
      linkKeys.add(relationship.key);
      nodeIds.add(source);
      nodeIds.add(target);
    }
    if (focusId && (source === focusId || target === focusId)) {
      linkKeys.add(relationship.key);
      nodeIds.add(source);
      nodeIds.add(target);
    }
  });
  return { nodeIds, linkKeys };
}

function isCoreRelationship(relationship, nodes) {
  const sourceId = getNodeId(relationship.source);
  const targetId = getNodeId(relationship.target);
  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  return isMainTag(source ?? {}) || isMainTag(target ?? {});
}

function organicLinkPath(relationship, index, alpha) {
  const sx = relationship.source.x;
  const sy = relationship.source.y;
  const tx = relationship.target.x;
  const ty = relationship.target.y;
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.max(1, Math.hypot(dx, dy));
  const wobble = (index % 2 ? -1 : 1) * (10 + alpha * 16);
  const cx = mx + (-dy / length) * wobble;
  const cy = my + (dx / length) * wobble;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

function focusNode(svg, zoom, width, height, node) {
  if (!node.x || !node.y) return;
  const scale = 1.42;
  const transform = d3.zoomIdentity.translate(width / 2 - node.x * scale, height / 2 - node.y * scale).scale(scale);
  svg.transition().duration(520).ease(d3.easeCubicOut).call(zoom.transform, transform);
}
