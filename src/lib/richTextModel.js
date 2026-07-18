import DOMPurify from "dompurify";
import TurndownService from "turndown";

export const RICH_TEXT_VERSION = 1;
export const RICH_TEXT_COLORS = [
  { id: "default", label: "黑色", value: "#2b2723", shortcut: "Alt+D" },
  { id: "red", label: "红色", value: "#c95f5a", shortcut: "Alt+R" },
  { id: "yellow", label: "黄色", value: "#b58a2a", shortcut: "Alt+Y" },
  { id: "green", label: "绿色", value: "#557a64", shortcut: "Alt+G" },
  { id: "blue", label: "蓝色", value: "#4f7593", shortcut: "Alt+B" },
  { id: "purple", label: "紫色", value: "#755b8d", shortcut: "Alt+P" },
];

const ALLOWED_TAGS = ["p", "div", "br", "strong", "em", "u", "s", "span", "ul", "ol", "li"];
const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right"]);
const COLOR_BY_NORMALIZED_VALUE = new Map(RICH_TEXT_COLORS.map((color) => [normalizeColor(color.value), color.value]));

export function sanitizeRichTextHtml(html) {
  const sanitized = DOMPurify.sanitize(String(html ?? ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
  });
  const body = parseHtml(sanitized);
  body.querySelectorAll("[style]").forEach((element) => sanitizeElementStyle(element));
  return body.innerHTML.trim();
}

export function createRichTextDocument(documentValue, fallbackText = "") {
  const html = documentValue?.version === RICH_TEXT_VERSION && typeof documentValue.html === "string"
    ? sanitizeRichTextHtml(documentValue.html)
    : plainTextToHtml(fallbackText);
  return { version: RICH_TEXT_VERSION, html };
}

export function plainTextToHtml(value) {
  const text = String(value ?? "");
  if (!text) return "";
  return text.split("\n").map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`).join("");
}

export function richTextToPlainText(documentValue) {
  const html = createRichTextDocument(documentValue).html;
  if (!html) return "";
  const body = parseHtml(html);
  const lines = [];
  body.childNodes.forEach((node) => {
    const text = nodeToPlainText(node).replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n");
    if (node.nodeType === 1 && ["P", "DIV", "UL", "OL", "LI"].includes(node.tagName)) lines.push(text.replace(/\n$/, ""));
    else if (text) lines.push(text);
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "");
}

export function richTextToMarkdown(documentValue) {
  const html = createRichTextDocument(documentValue).html;
  if (!html) return "";
  const turndown = new TurndownService({ bulletListMarker: "-", emDelimiter: "*", strongDelimiter: "**" });
  turndown.addRule("strikethrough", {
    filter: ["s", "del", "strike"],
    replacement: (content) => `~~${content}~~`,
  });
  turndown.addRule("underline", {
    filter: "u",
    replacement: (content) => `<u>${content}</u>`,
  });
  turndown.addRule("styledSpan", {
    filter: (node) => node.nodeName === "SPAN" && Boolean(node.getAttribute("style")),
    replacement: (content, node) => `<span style="${node.getAttribute("style")}">${content}</span>`,
  });
  return turndown.turndown(html).replace(/^([*-])\s{2,}/gm, "$1 ").trim();
}

function sanitizeElementStyle(element) {
  const declarations = [];
  const color = COLOR_BY_NORMALIZED_VALUE.get(normalizeColor(element.style.color));
  if (color) declarations.push(`color: ${color}`);

  const alignment = element.style.textAlign?.trim().toLowerCase();
  if (ALLOWED_ALIGNMENTS.has(alignment)) declarations.push(`text-align: ${alignment}`);

  const fontSize = /^([0-9]+(?:\.[0-9]+)?)px$/i.exec(element.style.fontSize?.trim() ?? "");
  if (fontSize) {
    const size = Number(fontSize[1]);
    if (size >= 12 && size <= 28) declarations.push(`font-size: ${size}px`);
  }

  const marginLeft = /^([0-9]+)px$/i.exec(element.style.marginLeft?.trim() ?? "");
  if (marginLeft && [24, 48, 72].includes(Number(marginLeft[1]))) declarations.push(`margin-left: ${Number(marginLeft[1])}px`);

  if (declarations.length) element.setAttribute("style", declarations.join("; "));
  else element.removeAttribute("style");
}

function normalizeColor(value) {
  if (!value || typeof document === "undefined") return String(value ?? "").trim().toLowerCase();
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.appendChild(probe);
  const normalized = window.getComputedStyle(probe).color.toLowerCase();
  probe.remove();
  return normalized;
}

function parseHtml(html) {
  const parser = new window.DOMParser();
  return parser.parseFromString(`<body>${html}</body>`, "text/html").body;
}

function nodeToPlainText(node) {
  if (node.nodeType === 3) return node.nodeValue ?? "";
  if (node.nodeType !== 1) return "";
  if (node.tagName === "BR") return "\n";
  const text = Array.from(node.childNodes).map(nodeToPlainText).join("");
  if (node.tagName === "LI") return `${text}\n`;
  return text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
