import * as d3 from "d3";

const GRAPH_SELECTOR = ".relation-graph";
const TOOLBAR_SELECTOR = ".graph-toolbar .toolbar-actions";
const RESET_BUTTON_CLASS = "relation-reset-button";

if (typeof document !== "undefined") {
  installRelationGraphRuntimeFix();
}

function installRelationGraphRuntimeFix() {
  ensureResetButtons();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button");
    if (!button) return;

    const graphCard = button.closest(GRAPH_SELECTOR);
    if (!graphCard) return;

    if (button.classList.contains(RESET_BUTTON_CLASS)) {
      event.preventDefault();
      resetGraphView(graphCard);
      return;
    }

    if (button.textContent?.trim() === "聚焦") {
      window.setTimeout(() => focusSelectedNode(graphCard), 0);
    }
  });

  const observer = new MutationObserver(() => ensureResetButtons());
  observer.observe(document.body, { childList: true, subtree: true });
}

function ensureResetButtons() {
  document.querySelectorAll(TOOLBAR_SELECTOR).forEach((toolbar) => {
    if (toolbar.querySelector(`.${RESET_BUTTON_CLASS}`)) return;
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = RESET_BUTTON_CLASS;
    resetButton.setAttribute("aria-label", "重置人物关系图视图");
    resetButton.textContent = "重置视图";
    toolbar.appendChild(resetButton);
  });
}

function focusSelectedNode(graphCard) {
  const svg = graphCard.querySelector("svg.relation-svg");
  const graphLayer = svg?.querySelector(".graph-layer");
  const selectedNode = svg?.querySelector(".graph-node.is-selected");
  if (!svg || !graphLayer || !selectedNode) return;

  const point = readTranslate(selectedNode.getAttribute("transform"));
  if (!point) return;

  const box = svg.getBoundingClientRect();
  const width = Math.max(640, box.width || 900);
  const height = Math.max(520, box.height || 620);
  const scale = 1.42;
  const transform = d3.zoomIdentity.translate(width / 2 - point.x * scale, height / 2 - point.y * scale).scale(scale);

  svg.__zoom = transform;
  d3.select(graphLayer)
    .transition()
    .duration(520)
    .ease(d3.easeCubicOut)
    .attr("transform", transform.toString());
}

function resetGraphView(graphCard) {
  const svg = graphCard.querySelector("svg.relation-svg");
  const graphLayer = svg?.querySelector(".graph-layer");
  if (!svg || !graphLayer) return;

  svg.__zoom = d3.zoomIdentity;
  d3.select(graphLayer)
    .transition()
    .duration(420)
    .ease(d3.easeCubicOut)
    .attr("transform", null);
}

function readTranslate(value = "") {
  const match = value.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}
