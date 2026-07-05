const aiTargets = {
  chatgpt: "https://chatgpt.com/",
  deepseek: "https://chat.deepseek.com/",
  claude: "https://claude.ai/new",
};

export async function copyPromptAndOpen(prompt, target) {
  const url = aiTargets[target];
  if (!url) return false;
  let copied = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch (error) {
    console.warn("AuthorHub AI handoff prompt could not be copied automatically.", error);
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return copied;
}
