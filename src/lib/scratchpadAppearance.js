const FONT_FAMILIES = {
  sans: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", "Songti SC", "STSong", "Noto Serif SC", serif',
  mono: '"Cascadia Mono", "SFMono-Regular", Consolas, "Noto Sans Mono CJK SC", monospace',
  yahei: '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", system-ui, sans-serif',
  songti: 'SimSun, "Songti SC", STSong, "Noto Serif SC", Georgia, serif',
  mimeograph: '"KaiTi", "STKaiti", "FangSong", "Noto Serif SC", serif',
};

const DARK_NODE_COLORS = {
  "#f8f5ea": "#263b56",
  "#e7eee8": "#2d465d",
  "#e6ebf1": "#34455e",
  "#eee8f1": "#403c59",
  "#f3eadc": "#4b4051",
};

export function getScratchpadReadingStyle(appearance = {}) {
  const size = Math.min(20, Math.max(10, Number(appearance.fontSize) || 14));
  const fontFamily = FONT_FAMILIES[appearance.fontFamily] ?? FONT_FAMILIES.sans;
  return {
    "--editor-font-size": `${size}px`,
    "--field-font-size": `${size}px`,
    "--reading-font-family": fontFamily,
  };
}

export function getScratchpadNodeColor(color, darkMode = false) {
  if (!darkMode) return color;
  return DARK_NODE_COLORS[color] ?? "#263b56";
}
