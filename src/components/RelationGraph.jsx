import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Check, Link2, Plus, Save, Sparkles, X, ZoomIn } from "lucide-react";
import FocusTextarea from "./FocusTextarea.jsx";
import MediaCarousel from "./MediaCarousel.jsx";

const ROLE_TAGS = ["主角1", "主角2", "主要配角", "反派", "亲友", "家族线"];
const NODE_COLORS = [
  "#A9A084",
  "#BFA57B",
  "#DDA96A",
  "#8BA09C",
  "#A7B8C8",
  "#C8A2A0",
  "#B7AA98",
  "#9EA58E",
  "#C6B7D2",
  "#D8B7A6",
  "#AFC7B6",
  "#C9C3AF",
  "#9FB1C5",
  "#D3AFA6",
  "#B9C4A6",
  "#C3B49A",
];

function emptyCharacter(novelId) {
  return {
    id: `${novelId}-${Date.now()}`,
    name: "新人物",
    age: 24,
    role: "待定角色",
    tag: "主要配角",
    color: "#DDA96A",
    background: "补充人物背景、成长经历和与主线的关系。",
    secret: "隐藏设定待补全。",
    images: [],
  };
}

export default function RelationGraph({ novel, onAddCharacter, onUpdateCharacter, onAddRelationship, onUpdateRelationship }) {
  const svgRef = useRef(null);
  const relationRef = useRef(null);
  const nodeSelectionRef = useRef(null);
  const linkSelectionRef = useRef(null);
  const labelSelectionRef = useRef(null);
  const linksRef = useRef([]);

  const [selectedId, setSelectedId] = useState(novel.characters[0]?.id);
  const [hoverId, setHoverId] = useState("");
  const [hoverLinkKey, setHoverLinkKey] = useState("");
  const [draft, setDraft] = useState(novel.characters[0] ?? null);
  const [connectFrom, setConnectFrom] = useState("");
  const [connectTo, setConnectTo] = useState("");
  const [connectLabel, setConnectLabel] = useState("关系");
  const [selectedRelationshipIndex, setSelectedRelationshipIndex] = useState(null);
  const [pendingNodeId, setPendingNodeId] = useState("");
  const [tagText, setTagText] = useState("");
  const [customTags, setCustomTags] = useState(() => getInitialCustomTags(novel.characters));
  const [detailPane, setDetailPane] = useState(36);
  const [resizing, setResizing] = useState(false);

  const allTags = useMemo(() => [...ROLE_TAGS, ...customTags.filter((tag) => !ROLE_TAGS.includes(tag))], [customTags]);
  const activeRelationshipKey =
    selectedRelationshipIndex !== null && novel.relationships?.[selectedRelationshipIndex]
      ? relationshipKey(novel.relationships[selectedRelationshipIndex], selectedRelationshipIndex)
      : "";
  const focusId = activeRelationshipKey ? "" : hoverId || selectedId || "";
  const selected = useMemo(
    () => novel.characters.find((character) => character.id === selectedId) ?? novel.characters[0],
    [novel.characters, selectedId],
  );

  useEffect(() => {
    setDraft(selected ? { ...selected, tag: getCharacterTag(selected) } : null);
  }, [selected]);

  useEffect(() => {
    setCustomTags((current) => {
      const next = [...current];
      getInitialCustomTags(novel.characters).forEach((tag) => {
        if (!next.includes(tag) && next.length < 5) next.push(tag);
      });
      return next;
    });
  }, [novel.characters]);

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

    const graphLayer = svg.append("g").attr("class", "graph-layer");
    const links = (novel.relationships ?? []).map((relationship, index) => ({
      ...relationship,
      index,
      key: relationshipKey(relationship, index),
    }));
    const nodes = (novel.characters ?? []).map((character, index) => {
      const tag = getCharacterTag(character);
      return {
        ...character,
        tag,
        labelWidth: Math.max(54, tag.length * 12 + 24),
        radius: isMainTag(character) ? 28 : 24,
        x: width / 2 + Math.cos(index * 1.7) * 150,
        y: height / 2 + Math.sin(index * 1.4) * 110,
      };
    });
    linksRef.current = links;

    const zoom = d3.zoom().scaleExtent([0.45, 2.8]).on("zoom", (event) => graphLayer.attr("transform", event.transform));
    svg.call(zoom);

    const link = graphLayer
      .append("g")
      .attr("class", "graph-links")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("stroke", novel.color)
      .attr("stroke-width", (relationship) => (isCoreRelationship(relationship, nodes) ? 1.7 : 1.25))
      .attr("stroke-dasharray", "5 7")
      .attr("stroke-opacity", 0.48)
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
      .attr("opacity", 0)
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
      .force("radial", d3.forceRadial((character) => (isMainTag(character) ? 130 : 270), width / 2, height / 2).strength(0.024))
      .force("collision", d3.forceCollide().radius((character) => Math.max(character.radius + 82, character.labelWidth / 2 + 44)).strength(0.96))
      .force("x", d3.forceX(width / 2).strength(0.01))
      .force("y", d3.forceY(height / 2).strength(0.01));

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
          .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.035).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }),
      );

    node
      .append("circle")
      .attr("r", (character) => character.radius + (isMainTag(character) ? 21 : 12))
      .attr("fill", (character) => (isMainTag(character) ? "rgba(244,213,191,0.42)" : novel.color))
      .attr("stroke", (character) => (isMainTag(character) ? "rgba(198,212,225,0.52)" : "none"))
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

    node.append("text").text((character) => character.name.slice(0, 2)).attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "#fff").attr("font-size", 13).attr("font-weight", 800);
    node.append("text").text((character) => character.name).attr("text-anchor", "middle").attr("y", (character) => character.radius + 27).attr("fill", "#3D3731").attr("font-size", 13).attr("font-weight", 800);
    node.append("text").text((character) => character.role).attr("text-anchor", "middle").attr("y", (character) => character.radius + 46).attr("fill", "#8D7A6B").attr("font-size", 11);

    simulation.on("tick", () => {
      nodes.forEach((character) => {
        const padX = character.labelWidth / 2 + 18;
        const padTop = character.radius + 58;
        character.x = Math.max(padX, Math.min(width - padX, character.x));
        character.y = Math.max(padTop, Math.min(height - 72, character.y));
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
    return () => simulation.stop();
  }, [novel.id, novel.characters, novel.relationships, novel.color, novel.accent, detailPane, pendingNodeId]);

  useEffect(() => {
    const node = nodeSelectionRef.current;
    const link = linkSelectionRef.current;
    const label = labelSelectionRef.current;
    if (!node || !link || !label) return;

    const edgeFocusKey = activeRelationshipKey || hoverLinkKey;
    const focus = getFocusSets(linksRef.current, focusId, edgeFocusKey);
    const hasFocus = Boolean(focusId || edgeFocusKey);
    node
      .classed("is-selected", (character) => character.id === selectedId)
      .classed("is-dimmed", (character) => hasFocus && !focus.nodeIds.has(character.id))
      .transition()
      .duration(160)
      .attr("opacity", (character) => (hasFocus ? (focus.nodeIds.has(character.id) ? 1 : 0.15) : 1));
    link
      .transition()
      .duration(160)
      .attr("stroke-opacity", (relationship) => (hasFocus ? (focus.linkKeys.has(relationship.key) ? 0.8 : 0.08) : 0.48))
      .attr("stroke-width", (relationship) => (activeRelationshipKey && relationship.key === activeRelationshipKey ? 2.6 : 1.35));
    label.transition().duration(160).attr("opacity", (relationship) => (focus.linkKeys.has(relationship.key) ? 1 : 0));
  }, [focusId, hoverLinkKey, selectedId, activeRelationshipKey]);

  function handleAddCharacter() {
    const character = emptyCharacter(novel.id);
    onAddCharacter(novel.id, character);
    setSelectedId(character.id);
  }

  function handleSaveCharacter() {
    onUpdateCharacter(novel.id, draft.id, draft);
  }

  function handleAddRelationship() {
    if (!connectFrom || !connectTo || connectFrom === connectTo) return;
    const relationship = { source: connectFrom, target: connectTo, label: connectLabel || "关系" };
    if (selectedRelationshipIndex !== null) {
      onUpdateRelationship(novel.id, selectedRelationshipIndex, relationship);
      setHoverLinkKey(relationshipKey(relationship, selectedRelationshipIndex));
    } else {
      onAddRelationship(novel.id, relationship);
      clearRelationshipSelection();
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
    const next = { source: connectFrom, target: connectTo, label: connectLabel, ...patch };
    setConnectFrom(next.source);
    setConnectTo(next.target);
    setConnectLabel(next.label);
    if (selectedRelationshipIndex !== null && next.source && next.target && next.source !== next.target) {
      onUpdateRelationship(novel.id, selectedRelationshipIndex, next);
    }
  }

  function clearRelationshipSelection() {
    setSelectedRelationshipIndex(null);
    setConnectFrom("");
    setConnectTo("");
    setConnectLabel("关系");
    setPendingNodeId("");
    setHoverLinkKey("");
  }

  function chooseTag(tag) {
    if (!draft) return;
    const nextDraft = { ...draft, tag };
    setDraft(nextDraft);
    onUpdateCharacter(novel.id, nextDraft.id, nextDraft);
  }

  function addTag() {
    const nextTag = tagText.trim();
    if (!nextTag) return;
    setCustomTags((current) => (current.includes(nextTag) ? current : [...current, nextTag].slice(0, 5)));
    chooseTag(nextTag);
    setTagText("");
  }

  function removeCustomTag(tag, event) {
    event.stopPropagation();
    setCustomTags((current) => current.filter((item) => item !== tag));
    if (draft?.tag === tag) chooseTag("主要配角");
  }

  return (
    <div ref={relationRef} className="relation-layout is-resizable" style={{ "--detail-pane": `${detailPane}%` }}>
      <div className="graph-card">
        <div className="graph-toolbar">
          <div>
            <p className="eyebrow">Relation graph</p>
            <h3>动感人物关系星图</h3>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={handleAddCharacter}>
              <Plus size={16} />
              新增人物
            </button>
            <button type="button" onClick={() => selected && setSelectedId(selected.id)}>
              <ZoomIn size={16} />
              聚焦
            </button>
          </div>
        </div>
        <svg ref={svgRef} className="relation-svg" aria-label={`${novel.title} 人物关系图谱`} />
        <div className="graph-hint">点击关系线文字可编辑；拖动中间细线可调整星图和人物详情占比。</div>
      </div>

      <div className="relation-split-handle" onMouseDown={() => setResizing(true)} role="separator" aria-orientation="vertical" aria-label="调整星图和人物详情宽度" />

      <aside className="inspector-card">
        {draft ? (
          <>
            <div className="inspector-head">
              <Sparkles size={18} />
              <div>
                <span>人物详情</span>
                <h3>{draft.name}</h3>
              </div>
            </div>
            <div className="inspector-scroll">
              <div className="character-editor-top">
                <MediaCarousel label="人物图片" images={draft.images ?? []} onChange={(images) => setDraft({ ...draft, images })} />
                <div className="character-quick-fields">
                  <label>
                    姓名
                    <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </label>
                  <label>
                    年龄
                    <input type="number" value={draft.age} onChange={(event) => setDraft({ ...draft, age: Number(event.target.value) })} />
                  </label>
                  <label>
                    身份 / 属性
                    <input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} />
                  </label>
                  <div className="tag-composer">
                    <span>标签</span>
                    <div className="tag-chip-board">
                      {allTags.map((tag) => (
                        <button type="button" key={tag} className={draft.tag === tag ? "is-selected" : ""} onClick={() => chooseTag(tag)}>
                          {tag}
                          {!ROLE_TAGS.includes(tag) && <i onClick={(event) => removeCustomTag(tag, event)}>×</i>}
                        </button>
                      ))}
                    </div>
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
                      <button type="button" onClick={addTag} disabled={!tagText.trim() || customTags.length >= 5}>
                        <Plus size={14} />
                      </button>
                    </div>
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
                      onClick={() => setDraft({ ...draft, color })}
                      aria-label={`选择颜色 ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="character-long-fields">
                <FocusTextarea label="背景故事" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} />
                <FocusTextarea label="隐藏设定" value={draft.secret} onChange={(secret) => setDraft({ ...draft, secret })} />
              </div>
              <p className="field-disclaimer">请勿上传违反法律法规或侵犯他人版权的内容。</p>
              <button type="button" className="primary-button" onClick={handleSaveCharacter}>
                <Save size={16} />
                保存人物
              </button>
              <div className="connect-box">
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
                <button type="button" onClick={handleAddRelationship}>
                  <Check size={15} />
                  {selectedRelationshipIndex === null ? "添加连线" : "保存关系"}
                </button>
                <button type="button" className="text-button" onClick={clearRelationshipSelection}>
                  <X size={14} />
                  清空关系选择
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>暂无人物。</p>
        )}
      </aside>
    </div>
  );
}

function getInitialCustomTags(characters) {
  return Array.from(new Set((characters ?? []).map((character) => normalizeLegacyTag(character.tag ?? character.faction)).filter((tag) => tag && !ROLE_TAGS.includes(tag)))).slice(0, 5);
}

function normalizeLegacyTag(tag = "") {
  if (tag === "主角攻") return "主角1";
  if (tag === "主角受") return "主角2";
  return tag || "主要配角";
}

function getCharacterTag(character) {
  return normalizeLegacyTag(character.tag ?? character.faction ?? "主要配角");
}

function isMainTag(character) {
  const tag = getCharacterTag(character);
  return tag.includes("主角1") || tag.includes("主角2");
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
