import React, { useEffect, useRef, useState } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  Handle,
  NodeToolbar,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import {
  Bold,
  Columns3,
  GitBranchPlus,
  Italic,
  Network,
  Palette,
  Plus,
  Rows3,
  Trash2,
} from "lucide-react";

const NODE_COLORS = ["#f8f5ea", "#e7eee8", "#e6ebf1", "#eee8f1", "#f3eadc"];
const NODE_WIDTH = 156;
const NODE_HEIGHT = 58;
const NODE_TYPES = { scratchIdea: ScratchIdeaNode };

export default function ScratchpadMindMap({ mindMap, onChange }) {
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [flowNodes, setFlowNodes] = useState(() => mindMap?.nodes ?? []);
  const [flowEdges, setFlowEdges] = useState(() => mindMap?.edges ?? []);
  const flowRef = useRef(null);
  const nodes = flowNodes;
  const edges = flowEdges;

  useEffect(() => setFlowNodes(mindMap?.nodes ?? []), [mindMap?.nodes]);
  useEffect(() => setFlowEdges(mindMap?.edges ?? []), [mindMap?.edges]);

  const renderedNodes = nodes.map((node) => ({
    ...node,
    type: "scratchIdea",
    selected: node.id === selectedNodeId,
    data: {
      ...node.data,
      onLabelChange: (label) => updateNode(node.id, { label }),
      onAction: (action) => handleNodeAction(action, node.id),
    },
  }));

  function commit(nextNodes, nextEdges = edges, options) {
    const cleanNodes = stripRuntimeData(nextNodes);
    const cleanEdges = stripRuntimeEdges(nextEdges);
    setFlowNodes(cleanNodes);
    setFlowEdges(cleanEdges);
    onChange?.({ nodes: cleanNodes, edges: cleanEdges }, options);
  }

  function addRoot() {
    const id = createNodeId();
    const node = createNode(id, "核心想法", { x: 80, y: 90 }, "root");
    setSelectedNodeId(id);
    setSelectedEdgeId("");
    commit([...nodes, node], edges, { immediate: true });
  }

  function addChild(parentId, variant = "detail") {
    const parent = nodes.find((node) => node.id === parentId);
    if (!parent) return addRoot();
    const id = createNodeId();
    const node = createNode(id, variant === "branch" ? "大子集" : "子主题", {
      x: parent.position.x + 210,
      y: parent.position.y + 88,
    }, variant);
    const edge = { id: createEdgeId(), source: parentId, target: id, type: "smoothstep" };
    setSelectedNodeId(id);
    setSelectedEdgeId("");
    commit([...nodes, node], [...edges, edge], { immediate: true });
  }

  function addSibling(nodeId) {
    const incoming = edges.find((edge) => edge.target === nodeId);
    if (!incoming) return addRoot();
    addChild(incoming.source, nodes.find((node) => node.id === nodeId)?.data?.variant ?? "detail");
  }

  function updateNode(nodeId, patch) {
    commit(nodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node));
  }

  function deleteNode(nodeId) {
    const descendants = collectDescendants(nodeId, edges);
    const removed = new Set([nodeId, ...descendants]);
    setSelectedNodeId("");
    commit(
      nodes.filter((node) => !removed.has(node.id)),
      edges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target)),
      { immediate: true },
    );
  }

  function deleteSelection() {
    if (selectedNodeId) return deleteNode(selectedNodeId);
    if (!selectedEdgeId) return;
    setSelectedEdgeId("");
    commit(nodes, edges.filter((edge) => edge.id !== selectedEdgeId), { immediate: true });
  }

  function handleDeleteKey(event) {
    if (!selectedNodeId && !selectedEdgeId) return;
    if (!['Backspace', 'Delete'].includes(event.key)) return;
    if (event.target.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
    deleteSelection();
  }

  function handleNodeAction(action, nodeId) {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    if (action === "child") return addChild(nodeId);
    if (action === "branch") return addChild(nodeId, "branch");
    if (action === "sibling") return addSibling(nodeId);
    if (action === "delete") return deleteNode(nodeId);
    if (action === "bold") return updateNode(nodeId, { bold: !node.data?.bold });
    if (action === "italic") return updateNode(nodeId, { italic: !node.data?.italic });
    if (action === "color") {
      const index = NODE_COLORS.indexOf(node.data?.color);
      return updateNode(nodeId, { color: NODE_COLORS[(index + 1 + NODE_COLORS.length) % NODE_COLORS.length] });
    }
  }

  function applyLayout(direction) {
    const next = layoutMindMap(nodes, edges, direction);
    commit(next, edges, { immediate: true });
    window.setTimeout(() => flowRef.current?.fitView({ padding: 0.18, duration: 260 }), 0);
  }

  return (
    <div className="scratchpad-map-editor" onKeyDown={handleDeleteKey}>
      <div className="scratchpad-map-tools" role="toolbar" aria-label="思维导图工具">
        <button type="button" onClick={addRoot}><Plus size={15} />根主题</button>
        <button type="button" onClick={() => selectedNodeId && addChild(selectedNodeId)} disabled={!selectedNodeId}><GitBranchPlus size={15} />子主题</button>
        <button type="button" onClick={() => selectedNodeId && addChild(selectedNodeId, "branch")} disabled={!selectedNodeId}><Network size={15} />大子集</button>
        <button type="button" onClick={() => selectedNodeId && addSibling(selectedNodeId)} disabled={!selectedNodeId}><Plus size={15} />同级主题</button>
        <button type="button" onClick={() => applyLayout("LR")} disabled={!nodes.length}><Columns3 size={15} />横向重排</button>
        <button type="button" onClick={() => applyLayout("TB")} disabled={!nodes.length}><Rows3 size={15} />纵向重排</button>
        <button type="button" className="danger-lite-button" onClick={deleteSelection} disabled={!selectedNodeId && !selectedEdgeId}><Trash2 size={15} />删除所选</button>
      </div>
      <div className="scratchpad-flow">
        <ReactFlow
          nodes={renderedNodes}
          edges={edges.map((edge) => ({ ...edge, selected: edge.id === selectedEdgeId }))}
          nodeTypes={NODE_TYPES}
          onInit={(instance) => { flowRef.current = instance; }}
          onNodesChange={(changes) => setFlowNodes((current) => applyNodeChanges(changes, current))}
          onEdgesChange={(changes) => {
            const next = applyEdgeChanges(changes, edges);
            setFlowEdges(next);
            if (changes.some((change) => change.type === "remove")) commit(nodes, next, { immediate: true });
          }}
          onNodeDragStop={(_, node) => commit(nodes.map((item) => item.id === node.id ? { ...item, position: node.position } : item), edges, { immediate: true })}
          onConnect={(connection) => commit(nodes, addEdge({ ...connection, id: createEdgeId(), type: "smoothstep" }, edges), { immediate: true })}
          isValidConnection={(connection) => Boolean(
            connection.source
            && connection.target
            && connection.source !== connection.target
            && !edges.some((edge) => edge.source === connection.source && edge.target === connection.target)
          )}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setSelectedEdgeId("");
          }}
          onEdgeClick={(_, edge) => {
            setSelectedNodeId("");
            setSelectedEdgeId(edge.id);
          }}
          onPaneClick={() => {
            setSelectedNodeId("");
            setSelectedEdgeId("");
          }}
          fitView
          minZoom={0.35}
          maxZoom={2.2}
          deleteKeyCode={null}
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "#70867a", strokeWidth: 1.5 } }}
        >
          <Background gap={22} size={1} color="rgba(70, 92, 80, 0.2)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

function ScratchIdeaNode({ data, selected }) {
  return (
    <div
      className={`scratch-idea-node is-${data.variant || "detail"}${selected ? " is-selected" : ""}`}
      style={{ backgroundColor: data.color || NODE_COLORS[0] }}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="scratch-node-toolbar">
        <button type="button" onClick={() => data.onAction("child")} title="新增子主题"><GitBranchPlus size={14} /></button>
        <button type="button" onClick={() => data.onAction("branch")} title="新增大子集"><Network size={14} /></button>
        <button type="button" onClick={() => data.onAction("bold")} aria-pressed={Boolean(data.bold)} title="加粗"><Bold size={14} /></button>
        <button type="button" onClick={() => data.onAction("italic")} aria-pressed={Boolean(data.italic)} title="斜体"><Italic size={14} /></button>
        <button type="button" onClick={() => data.onAction("color")} title="切换节点颜色"><Palette size={14} /></button>
        <button type="button" onClick={() => data.onAction("delete")} title="删除节点及子级"><Trash2 size={14} /></button>
      </NodeToolbar>
      <Handle type="target" position={Position.Left} />
      <input
        value={data.label ?? ""}
        onChange={(event) => data.onLabelChange(event.target.value.slice(0, 80))}
        onPointerDown={(event) => event.stopPropagation()}
        style={{ fontWeight: data.bold ? 700 : 500, fontStyle: data.italic ? "italic" : "normal" }}
        aria-label="思维导图节点文字"
      />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function createNode(id, label, position, variant) {
  return { id, type: "scratchIdea", position, data: { label, variant, color: NODE_COLORS[variant === "root" ? 1 : variant === "branch" ? 2 : 0] } };
}

function layoutMindMap(nodes, edges, direction) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, ranksep: 72, nodesep: 38, marginx: 24, marginy: 24 });
  nodes.forEach((node) => graph.setNode(node.id, { width: node.data?.variant === "branch" ? 188 : NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  return nodes.map((node) => {
    const position = graph.node(node.id);
    const width = node.data?.variant === "branch" ? 188 : NODE_WIDTH;
    return { ...node, position: { x: position.x - width / 2, y: position.y - NODE_HEIGHT / 2 } };
  });
}

function collectDescendants(nodeId, edges) {
  const result = [];
  const queue = [nodeId];
  while (queue.length) {
    const source = queue.shift();
    edges.filter((edge) => edge.source === source).forEach((edge) => {
      if (result.includes(edge.target)) return;
      result.push(edge.target);
      queue.push(edge.target);
    });
  }
  return result;
}

function stripRuntimeData(nodes) {
  return nodes.map((node) => {
    const { onAction, onLabelChange, ...data } = node.data ?? {};
    return {
      id: node.id,
      type: "scratchIdea",
      position: { x: Number(node.position?.x) || 0, y: Number(node.position?.y) || 0 },
      data: {
        label: String(data.label ?? "").slice(0, 80),
        variant: ["root", "branch", "detail"].includes(data.variant) ? data.variant : "detail",
        color: NODE_COLORS.includes(data.color) ? data.color : NODE_COLORS[0],
        bold: Boolean(data.bold),
        italic: Boolean(data.italic),
      },
    };
  });
}

function stripRuntimeEdges(edges) {
  return edges
    .filter((edge) => edge?.id && edge?.source && edge?.target)
    .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, type: "smoothstep" }));
}

function createNodeId() {
  return `scratch-node-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}

function createEdgeId() {
  return `scratch-edge-${crypto.randomUUID?.() ?? Date.now().toString(36)}`;
}
