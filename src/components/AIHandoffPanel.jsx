import React from "react";
import { Bot, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { buildFullHubPrompt, copyPromptAndOpen } from "../lib/aiHandoff.js";

export default function AIHandoffPanel({ data }) {
  const [copied, setCopied] = useState("");

  async function openTarget(target) {
    await copyPromptAndOpen(buildFullHubPrompt(data), target);
    setCopied(target);
  }

  return (
    <section className="section ai-handoff-section">
      <div className="ai-handoff-card">
        <div>
          <p className="eyebrow">AI companion</p>
          <h2>把当前网页资料交给 ChatGPT 或 DeepSeek</h2>
          <p>
            点击后会复制 Author Hub 当前保存的完整 JSON 上下文，并打开一个 AI 新对话。进入 AI 页面后粘贴即可继续追问，回到本页再把满意答案填入设定或时间线。
          </p>
        </div>
        <div className="ai-handoff-actions">
          <button type="button" onClick={() => openTarget("chatgpt")}>
            <ExternalLink size={16} />
            复制上下文并打开 ChatGPT
          </button>
          <button type="button" onClick={() => openTarget("deepseek")}>
            <ExternalLink size={16} />
            复制上下文并打开 DeepSeek
          </button>
          <span>
            <Copy size={14} />
            {copied ? `已复制，已打开 ${copied === "chatgpt" ? "ChatGPT" : "DeepSeek"}` : "不会自动上传你的内容"}
          </span>
        </div>
        <Bot className="ai-handoff-mark" size={72} />
      </div>
    </section>
  );
}
