export const aiTargets = {
  chatgpt: "https://chatgpt.com/",
  deepseek: "https://chat.deepseek.com/",
  claude: "https://claude.ai/new",
};

export async function copyPromptAndOpen(prompt, target) {
  await navigator.clipboard.writeText(prompt);
  window.open(aiTargets[target], "_blank", "noopener,noreferrer");
}
