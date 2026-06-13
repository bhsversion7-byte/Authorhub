export const aiTargets = {
  chatgpt: "https://chatgpt.com/",
  deepseek: "https://chat.deepseek.com/",
  claude: "https://claude.ai/new",
};

export function buildFullHubPrompt(data) {
  return `你是我的小说创作设定顾问。请阅读下面 Author Hub 中当前保存的全部资料，帮我整理每本小说的大纲、设定集、人物关系和发展时间线。回答时优先指出：逻辑漏洞、人物动机不足、时间线冲突、可补充的真实背景资料关键词。

${JSON.stringify(data, null, 2)}`;
}

export function buildEventPrompt(novel, event) {
  return `你是我的小说世界观考据和剧情顾问。请基于下面这本小说和当前时间点，补全真实可信的背景资料、关键词、可引用的常识方向，并指出该事件可能影响哪些人物关系。

小说资料：
${JSON.stringify(
    {
      title: novel.title,
      genre: novel.genre,
      outline: novel.outline,
      setting: novel.setting,
      themes: novel.themes,
      characters: novel.characters,
      relationships: novel.relationships,
    },
    null,
    2,
  )}

当前时间点：
${JSON.stringify(event, null, 2)}

请输出：
1. 背景真实性补全
2. 可继续搜索的关键词
3. 对人物动机和关系的影响
4. 可直接写入设定集的一段文字`;
}

export async function copyPromptAndOpen(prompt, target) {
  await navigator.clipboard.writeText(prompt);
  window.open(aiTargets[target], "_blank", "noopener,noreferrer");
}
