import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";
import Sortable from "sortablejs";
import { Check, Link2, Plus, RotateCcw, Save, Sparkles, Trash2, X, ZoomIn } from "lucide-react";
import { patchFocusPageMap } from "../lib/focusPages.js";
import {
  MAIN_PAIR_RELATION_COLOR,
  getCharacterRelationTag,
  isMainCharacter,
  isMainPairRelationship,
} from "../lib/relationGraphRules.js";
import FocusTextarea from "./FocusTextarea.jsx";
import MediaCarousel from "./MediaCarousel.jsx";

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
  const linksRef = useRef([]);
  const zoomRef = useRef(null);
  const zoomTransformRef = useRef(d3.zoomIdentity);
  const dimsRef = useRef({ width: 0, height: 0 });
  const nodesRef = useRef([]);
  // Survives the simulation being rebuilt (new character added, a node
  // clicked to select it, etc.) so an existing character resumes from
  // wherever it last settled instead of jumping back to a fresh formula
  // position every time. Cleared only by 重置视图.
  const nodePositionsRef = useRef(new Map());

  const [selectedId, setSelectedId] = useState(novel.characters[0]?.id);
  const [graphFocusId, setGraphFocusId] = useState("");
  const [hoverId, setHoverId] = useState("");
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const [hoverLinkKey, setHoverLinkKey] = useState("");
  const [draft, setDraft] = useState(novel.characters[0] ?? null);
  const [connectFrom, setConnectFrom] = useState("");
  const [connectTo, setConnectTo] = useState("");
  const [connectLabel, setConnectLabel] = useState("关系");
  const [selectedRelationshipIndex, setSelectedRelationshipIndex] = useState(null);
  const [pendingNodeId, setPendingNodeId] = useState("");
  const [tagText, setTagText] = useState("");
  const [detailPane, setDetailPane] = useState(36);
  const [resizing, setResizing] = useState(false);
  const [deleteCharacterCandidate, setDeleteCharacterCandidate] = useState(null);
  const [confirmClearRelationship, setConfirmClearRelationship] = useState(false);

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
      ? relationshipKey({ source: connectFrom, target: connectTo }, selectedRelationshipIndex ?? "__preview")
      : "";
  const activeRelationshipKey =
    selectedRelationshipIndex !== null && novel.relationships?.[selectedRelationshipIndex]
      ? draftRelationshipKey || relationshipKey(novel.relationships[selectedRelationshipIndex], selectedRelationshipIndex)
      : "";
  const previewRelationship =
    connectFrom && connectTo && connectFrom !== connectTo && selectedRelationshipIndex === null
      ? { source: connectFrom, target: connectTo, label: connectLabel || "关系", index: "__preview", isPreview: true }
      : null;
  const previewRelationshipKey = previewRelationship ? draftRelationshipKey : "";
  const focusId = activeRelationshipKey || previewRelationshipKey ? "" : hoverId || graphFocusId || "";
  const selected = useMemo(
    () => novel.characters.find((character) => character.id === selectedId) ?? novel.characters[0],
    [novel.characters, selectedId],
  );

  useEffect(() => {
    setDraft(selected ? { ...selected, tag: getCharacterTag(selected) } : null);
  }, [selected]);

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

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

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

    svg
      .append("rect")
      .attr("class", "graph-hit-area")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("click", (event) => {
        event.stopPropagation();
        clearGraphSelection();
      });

    const graphLayer = svg.append("g").attr("class", "graph-layer");
    const links = (novel.relationships ?? []).map((relationship, index) => {
      const displayRelationship =
        index === selectedRelationshipIndex && connectFrom && connectTo
          ? { ...relationship, source: connectFrom, target: connectTo, label: connectLabel || "关系", isPreview: true }
          : relationship;
      return {
        ...displayRelationship,
        index,
        key: relationshipKey(displayRelationship, index),
      };
    });
    if (previewRelationship) {
      links.push({
        ...previewRelationship,
        key: previewRelationshipKey,
      });
    }
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
      const remembered = nodePositionsRef.current.get(character.id);
      const isMain = isMainTag(character);
      const ringRadius = isMain ? 0 : ringRadiusFor(character.id);
      const angle = isMain ? 0 : (nonMainIndex++ / nonMainCount) * Math.PI * 2;
      // Node size also follows Obsidian's convention that better-connected
      // nodes read as more important - a character with several relationships
      // grows a little larger than one with none, capped so the main
      // character(s) (already the visual focus via the halo) stay the
      // biggest plain circle on the star-map.
      const degree = adjacency.get(character.id)?.size ?? 0;
      return {
        ...character,
        tag,
        labelWidth: Math.max(54, tag.length * 12 + 24),
        radius: isMain ? 28 + Math.min(degree, 5) * 1.2 : 21 + Math.min(degree, 6) * 1.6,
        ringRadius,
        x: remembered?.x ?? (isMain ? width / 2 : width / 2 + Math.cos(angle) * ringRadius),
        y: remembered?.y ?? (isMain ? height / 2 : height / 2 + Math.sin(angle) * ringRadius),
      };
    });
    linksRef.current = links;

    const zoom = d3
      .zoom()
      .scaleExtent([0.45, 2.8])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.button) return false;
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
      .on("click", selectRelationship);

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
      .on("click", selectRelationship);

    label
      .append("rect")
      .attr("x", (relationship) => -Math.max(38, String(relationship.label).length * 13) / 2)
      .attr("y", -12)
      .attr("width", (relationship) => Math.max(38, String(relationship.label).length * 13))
      .attr("height", 24)
      .attr("rx", 12);
    label.append("text").text((relationship) => relationship.label).attr("text-anchor", "middle").attr("dy", "0.34em");

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
      .style("cursor", "grab")
      .on("mouseenter", (_, character) => setHoverId(character.id))
      .on("mouseleave", () => setHoverId(""))
      .on("click", (event, character) => {
        selectNodeForRelationship(event, character);
        focusNode(svg, zoom, width, height, character);
      })
      .call(
        d3
          .drag()
          .container(graphLayer.node())
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
            event.subject.fx = null;
            event.subject.fy = null;
            d3.select(event.sourceEvent?.target?.closest?.(".graph-node")).style("cursor", "grab");
          }),
      );

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
    });

    nodeSelectionRef.current = node;
    linkSelectionRef.current = link;
    labelSelectionRef.current = label;
    nodesRef.current = nodes;
    return () => simulation.stop();
  }, [
    novel.id,
    novel.characters,
    novel.relationships,
    novel.color,
    novel.accent,
    detailPane,
    pendingNodeId,
    connectFrom,
    connectTo,
    selectedRelationshipIndex,
    activeRelationshipKey,
    previewRelationshipKey,
    layoutResetKey,
  ]);

  useEffect(() => {
    const label = labelSelectionRef.current;
    if (!label || !connectFrom || !connectTo || connectFrom === connectTo) return;

    const nextLabel = connectLabel || "关系";
    label.each((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      const isSamePair = (source === connectFrom && target === connectTo) || (source === connectTo && target === connectFrom);
      const isSelectedEdge = selectedRelationshipIndex !== null && relationship.index === selectedRelationshipIndex;
      const isPreviewEdge = selectedRelationshipIndex === null && relationship.isPreview && isSamePair;
      if (isSelectedEdge || isPreviewEdge) relationship.label = nextLabel;
    });

    label
      .select("rect")
      .attr("x", (relationship) => -Math.max(38, String(relationship.label).length * 13) / 2)
      .attr("width", (relationship) => Math.max(38, String(relationship.label).length * 13));
    label.select("text").text((relationship) => relationship.label);
  }, [connectLabel, connectFrom, connectTo, selectedRelationshipIndex]);

  useEffect(() => {
    const node = nodeSelectionRef.current;
    const link = linkSelectionRef.current;
    const label = labelSelectionRef.current;
    if (!node || !link || !label) return;

    const edgeFocusKey = activeRelationshipKey || previewRelationshipKey || hoverLinkKey;
    const focus = getFocusSets(linksRef.current, focusId, edgeFocusKey);
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
    d3.select(svgElement).transition().duration(520).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity);
    // Drop every remembered position so the rebuild this triggers puts the
    // main character(s) back at dead center instead of resuming wherever
    // they'd drifted to - the one thing 重置视图 is supposed to restore.
    nodePositionsRef.current.clear();
    setLayoutResetKey((current) => current + 1);
  }

  function handleSaveCharacter() {
    if (!draft || readOnly) return;
    onUpdateCharacter(novel.id, draft.id, draft);
  }

  function updateDraftFocusPages(key, pages) {
    if (!draft || readOnly) return;
    const nextFocusPages = patchFocusPageMap(draft.focusPages, key, pages);
    setDraft((current) => (current ? { ...current, focusPages: nextFocusPages } : current));
    // Focus-editor page add/rename/reorder/delete must reach Supabase right
    // away, not sit gated behind the separate "保存人物" button - the delete
    // confirmation copy already promises this ("并同步到云端保存"), and it's
    // a structural deletion (standing rule: deletions must always sync).
    // Persisted against `selected` (the last-saved character), not the full
    // `draft`, so an in-progress unsaved text edit isn't force-committed too.
    if (selected) onUpdateCharacter(novel.id, selected.id, { ...selected, focusPages: nextFocusPages });
  }

  function requestDeleteCharacter() {
    if (!draft || readOnly) return;
    setDeleteCharacterCandidate(draft);
  }

  function confirmDeleteCharacter() {
    if (!deleteCharacterCandidate) return;
    const remainingCharacters = novel.characters.filter((character) => character.id !== deleteCharacterCandidate.id);
    const nextCharacter = remainingCharacters[0] ?? null;
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
    if (selectedRelationshipIndex !== null) {
      onUpdateRelationship(novel.id, selectedRelationshipIndex, relationship);
      setHoverLinkKey(relationshipKey(relationship, selectedRelationshipIndex));
    } else {
      const nextIndex = novel.relationships?.length ?? 0;
      onAddRelationship(novel.id, relationship);
      setSelectedRelationshipIndex(nextIndex);
      setHoverLinkKey(relationshipKey(relationship, nextIndex));
      setPendingNodeId("");
    }
  }

  function selectRelationship(event, relationship) {
    event.stopPropagation();
    setSelectedRelationshipIndex(relationship.index);
    setConnectFrom(getNodeId(relationship.source));
    setConnectTo(getNodeId(relationship.target));
    setConnectLabel(relationship.label || "关系");
    setHoverLinkKey(relationship.key);
    setPendingNodeId("");
  }

  function selectNodeForRelationship(event, character) {
    event.stopPropagation();
    character.fx = character.x;
    character.fy = character.y;
    setSelectedId(character.id);
    setGraphFocusId(character.id);

    if (readOnly) {
      window.setTimeout(() => {
        character.fx = null;
        character.fy = null;
      }, 900);
      return;
    }

    if (pendingNodeId && pendingNodeId !== character.id) {
      selectRelationshipBetween(pendingNodeId, character.id);
      setPendingNodeId("");
    } else {
      setPendingNodeId(character.id);
      if (selectedRelationshipIndex !== null) {
        setSelectedRelationshipIndex(null);
        setHoverLinkKey("");
      }
    }

    window.setTimeout(() => {
      character.fx = null;
      character.fy = null;
    }, 900);
  }

  function selectRelationshipBetween(sourceId, targetId) {
    const relationshipIndex = (novel.relationships ?? []).findIndex((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      return (source === sourceId && target === targetId) || (source === targetId && target === sourceId);
    });

    setConnectFrom(sourceId);
    setConnectTo(targetId);
    if (relationshipIndex >= 0) {
      const relationship = novel.relationships[relationshipIndex];
      setSelectedRelationshipIndex(relationshipIndex);
      setConnectFrom(getNodeId(relationship.source));
      setConnectTo(getNodeId(relationship.target));
      setConnectLabel(relationship.label || "");
      setHoverLinkKey(relationshipKey(relationship, relationshipIndex));
    } else {
      setSelectedRelationshipIndex(null);
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
    if (selectedRelationshipIndex === null && next.source && next.target && next.source !== next.target) {
      const existingIndex = findRelationshipIndex(next.source, next.target);
      if (existingIndex >= 0) {
        const existing = novel.relationships[existingIndex];
        setSelectedRelationshipIndex(existingIndex);
        setConnectLabel(existing.label || next.label || "");
        setHoverLinkKey(relationshipKey(existing, existingIndex));
        return;
      }
    }
  }

  function findRelationshipIndex(sourceId, targetId) {
    return (novel.relationships ?? []).findIndex((relationship) => {
      const source = getNodeId(relationship.source);
      const target = getNodeId(relationship.target);
      return (source === sourceId && target === targetId) || (source === targetId && target === sourceId);
    });
  }

  function clearRelationshipSelection() {
    setSelectedRelationshipIndex(null);
    setConnectFrom("");
    setConnectTo("");
    setConnectLabel("关系");
    setPendingNodeId("");
    setHoverLinkKey("");
    setConfirmClearRelationship(false);
  }

  function clearSelectedRelationship() {
    if (selectedRelationshipIndex !== null) {
      onDeleteRelationship?.(novel.id, selectedRelationshipIndex);
    }
    clearRelationshipSelection();
  }

  function clearGraphSelection() {
    setGraphFocusId("");
    setHoverId("");
    clearRelationshipSelection();
  }

  // Multi-select: a character can carry several tags. `tags` is the source of
  // truth; `tag` is kept as the derived primary (a main-character tag wins,
  // else the first) so the graph node label and main-character detection -
  // which both read `character.tag` - keep working unchanged.
  function assignCharacterTags(nextTags) {
    if (!draft || readOnly) return;
    const nextDraft = { ...draft, tags: nextTags, tag: derivePrimaryTag(nextTags) };
    setDraft(nextDraft);
    onUpdateCharacter(novel.id, nextDraft.id, nextDraft);
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
      setDraft({ ...draft, tags: remaining, tag: derivePrimaryTag(remaining) });
    }
  }

  function chooseNodeColor(color) {
    if (!draft || readOnly) return;
    const nextDraft = { ...draft, color };
    setDraft(nextDraft);
    onUpdateCharacter(novel.id, nextDraft.id, { color });
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

      {showDetails && <aside className="inspector-card">
        {draft ? (
          <>
            <div className="inspector-head" data-tour="detail-panel-head">
              <Sparkles size={18} />
              <div>
                <span>人物详情</span>
                <h3>{draft.name}</h3>
              </div>
            </div>
            <div className="inspector-scroll">
              <div className="character-editor-top">
                <MediaCarousel label="人物图片" images={draft.images ?? []} onChange={(images) => setDraft({ ...draft, images })} readOnly={readOnly} />
                <div className="character-quick-fields character-attribute-grid">
                  <label>
                    姓名
                    <input value={draft.name} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </label>
                  <label>
                    年龄
                    <input value={draft.age ?? ""} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, age: event.target.value })} />
                  </label>
                  <label>
                    身份 / 属性
                    <input value={draft.role} readOnly={readOnly} onChange={(event) => setDraft({ ...draft, role: event.target.value })} />
                  </label>
                  <div className="tag-composer">
                    <span>标签（可多选）</span>
                    <div className="tag-chip-board" ref={tagBoardRef}>
                      {boardTags.map((tag) => (
                        <button
                          type="button"
                          key={tag}
                          data-tag={tag}
                          className={draftTags.includes(tag) ? "is-selected" : ""}
                          onClick={() => toggleTag(tag)}
                          disabled={readOnly}
                        >
                          {tag}
                          {!readOnly && (
                            <i
                              className="tag-chip-remove"
                              role="button"
                              tabIndex={-1}
                              onClick={(event) => removeTagFromPalette(tag, event)}
                              onPointerDown={(event) => event.stopPropagation()}
                              aria-label={`删除标签 ${tag}`}
                            >
                              ×
                            </i>
                          )}
                        </button>
                      ))}
                    </div>
                    {!readOnly && (
                      <div className="tag-compose-row">
                        <input
                          value={tagText}
                          onChange={(event) => setTagText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="输入标签，回车生成"
                        />
                        <button type="button" onClick={addTag} disabled={!tagText.trim() || tagPalette.length >= 12}>
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="node-color-picker is-wide">
                <span>星球颜色</span>
                <div>
                  {NODE_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={draft.color === color ? "is-selected" : ""}
                      style={{ "--swatch": color }}
                      onClick={() => chooseNodeColor(color)}
                      disabled={readOnly}
                      aria-label={`选择颜色 ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="character-long-fields">
                <FocusTextarea
                  label="背景故事"
                  value={draft.background}
                  pages={draft.focusPages?.background}
                  onPagesChange={(pages) => updateDraftFocusPages("background", pages)}
                  onChange={(background) => setDraft((current) => (current ? { ...current, background } : current))}
                  onSave={handleSaveCharacter}
                  readOnly={readOnly}
                />
                {!readOnly && (
                  <FocusTextarea
                    label="隐藏设定"
                    value={draft.secret}
                    pages={draft.focusPages?.secret}
                    onPagesChange={(pages) => updateDraftFocusPages("secret", pages)}
                    onChange={(secret) => setDraft((current) => (current ? { ...current, secret } : current))}
                    onSave={handleSaveCharacter}
                    readOnly={readOnly}
                  />
                )}
              </div>
              {!readOnly && (
                <div className="character-action-row">
                  <button type="button" className="primary-button" onClick={handleSaveCharacter}>
                    <Save size={16} />
                    保存人物
                  </button>
                  <button type="button" className="danger-lite-button" onClick={requestDeleteCharacter}>
                    <Trash2 size={15} />
                    删除人物
                  </button>
                </div>
              )}
              {!readOnly && <div className="connect-box">
                <div className="panel-title">
                  <Link2 size={17} />
                  <h4>{selectedRelationshipIndex === null ? "建立关系" : "编辑关系"}</h4>
                </div>
                <select value={connectFrom} onChange={(event) => updateRelationshipDraft({ source: event.target.value })}>
                  <option value="">起点人物</option>
                  {novel.characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
                <select value={connectTo} onChange={(event) => updateRelationshipDraft({ target: event.target.value })}>
                  <option value="">终点人物</option>
                  {novel.characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
                <input value={connectLabel} onChange={(event) => updateRelationshipDraft({ label: event.target.value })} placeholder="关系标签" />
                <div className="relation-action-row">
                  <button type="button" className="primary-button relation-save-button" onClick={handleAddRelationship}>
                    <Check size={15} />
                    {selectedRelationshipIndex === null ? "添加连线" : "保存关系"}
                  </button>
                  <button type="button" className="danger-lite-button relation-clear-button" onClick={() => setConfirmClearRelationship(true)}>
                    <X size={14} />
                    清空所选关系
                  </button>
                </div>
              </div>}
            </div>
          </>
        ) : (
          <p>暂无人物。</p>
        )}
      </aside>}
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
                {selectedRelationshipIndex !== null
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

function relationshipKey(relationship, index) {
  return `${getNodeId(relationship.source)}-${getNodeId(relationship.target)}-${index}`;
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
