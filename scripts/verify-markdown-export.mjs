import assert from "node:assert/strict";
import { buildMarkdownExport } from "../src/lib/markdownExport.js";

const markdown = buildMarkdownExport({
  author: {
    pseudonym: "Export Writer",
    age: "保密",
    updateFrequency: "按节奏更新",
    platform: "AO3 / 晋江",
  },
  novels: [
    {
      title: "导出测试小说",
      subtitle: "字段兼容测试",
      genre: "关系图谱",
      currentWords: 1200,
      targetWords: 5000,
      finishDate: "2027-01-01",
      outline: "大纲正文",
      setting: "设定正文",
      themes: ["信任"],
      characters: [
        { id: "x", name: "X", role: "档案修复师 / 主角1", tag: "主角1" },
        { id: "y", name: "Y", tag: "主角2" },
      ],
      relationships: [
        { source: { id: "x" }, target: { id: "y" }, label: "互相信任" },
      ],
      timeline: [{ date: "序章", title: "旧档案被重新打开" }],
    },
  ],
});

assert.match(markdown, /# AuthorHub Export/);
assert.match(markdown, /- X：档案修复师 \/ 主角1/);
assert.match(markdown, /- Y：主角2/);
assert.match(markdown, /- x → y：互相信任/);
assert.doesNotMatch(markdown, /undefined/);

console.log("markdown export checks passed");
