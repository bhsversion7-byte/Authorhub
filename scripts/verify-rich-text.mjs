import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.NodeFilter = dom.window.NodeFilter;

const {
  createRichTextDocument,
  richTextToMarkdown,
  richTextToPlainText,
  sanitizeRichTextHtml,
} = await import("../src/lib/richTextModel.js");

const legacy = createRichTextDocument(undefined, "第一行\n第二行 <测试>");
assert.equal(legacy.version, 1);
assert.equal(legacy.html, "<p>第一行</p><p>第二行 &lt;测试&gt;</p>");
assert.equal(richTextToPlainText(legacy), "第一行\n第二行 <测试>");

const unsafe = sanitizeRichTextHtml(`
  <p onclick="steal()" style="color: #c95f5a; font-size: 18px; background-image: url(javascript:bad)">
    <strong>保留</strong><script>alert(1)</script><img src=x onerror=steal()>
  </p>
  <div style="text-align: center"><u>下划线</u> <s>删除线</s></div>
`);
assert.doesNotMatch(unsafe, /script|onclick|onerror|img|background|javascript/i);
assert.match(unsafe, /color: rgb\(201, 95, 90\)|color: #c95f5a/i);
assert.match(unsafe, /font-size: 18px/i);
assert.match(unsafe, /text-align: center/i);

const clamped = sanitizeRichTextHtml('<p style="font-size: 60px; color: hotpink; text-align: justify">正文</p>');
assert.doesNotMatch(clamped, /60px|hotpink|justify/i);
assert.match(sanitizeRichTextHtml('<p style="margin-left: 48px">缩进</p>'), /margin-left: 48px/i);
assert.doesNotMatch(sanitizeRichTextHtml('<p style="margin-left: 13px">非法缩进</p>'), /margin-left/i);

const markdown = richTextToMarkdown({
  version: 1,
  html: '<p><strong>粗体</strong>、<em>斜体</em>、<s>删除</s>、<u>下划线</u>、<span style="color: #c95f5a">红色</span></p><ul><li>项目</li></ul>',
});
assert.match(markdown, /\*\*粗体\*\*/);
assert.match(markdown, /\*斜体\*/);
assert.match(markdown, /~~删除~~/);
assert.match(markdown, /<u>下划线<\/u>/);
assert.match(markdown, /<span style="color: #c95f5a">红色<\/span>/);
assert.match(markdown, /- 项目/);

console.log("rich text checks passed");
