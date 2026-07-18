export function getRelationshipEndpointId(endpoint) {
  return typeof endpoint === "object" ? endpoint?.id : endpoint;
}

function characterExportLabel(character) {
  return character?.role || character?.tag || character?.faction || "未填写";
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function buildMarkdownExport(data) {
  const sections = [
    "# AuthorHub Export",
    "",
    "## 作者",
    `- 笔名：${data.author.pseudonym}`,
    `- 年龄：${data.author.age}`,
    `- 更新频率：${data.author.updateFrequency}`,
    `- 首发平台：${data.author.platform}`,
    "",
  ];

  data.novels.forEach((novel) => {
    sections.push(
      `## ${novel.title}`,
      `_${novel.subtitle}_`,
      "",
      `- 类型：${novel.genre}`,
      `- 当前字数：${novel.currentWords}`,
      `- 预计总字数：${novel.targetWords}`,
      `- 完结时间：${novel.finishDate}`,
      "",
    );
    sections.push(
      "### 大纲",
      richTextToMarkdown(novel.richText?.outline, novel.outline),
      "",
      "### 设定集",
      richTextToMarkdown(novel.richText?.setting, novel.setting),
      "",
    );
    sections.push("### 主题", ...(novel.themes ?? []).map((theme) => `- ${theme}`), "");
    sections.push(
      "### 人物",
      ...(novel.characters ?? []).filter(isRecord).map((character) => `- ${character.name ?? "未命名人物"}：${characterExportLabel(character)}`),
      "",
    );
    sections.push(
      "### 关系",
      ...(novel.relationships ?? []).map(
        (relationship) =>
          `- ${getRelationshipEndpointId(relationship.source)} → ${getRelationshipEndpointId(relationship.target)}：${relationship.label}`,
      ),
      "",
    );
    sections.push("### 时间线", ...(novel.timeline ?? []).filter(isRecord).map((event) => `- ${event.date ?? ""}｜${event.title ?? "未命名时间点"}`), "");
  });

  return sections.join("\n");
}
import { richTextToMarkdown } from "./richTextModel.js";
