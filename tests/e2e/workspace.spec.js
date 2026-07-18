import { expect, test } from "@playwright/test";

const localUser = {
  id: "local-e2e@example.test",
  email: "e2e@example.test",
  user_metadata: { username: "e2e" },
  app_metadata: { provider: "local-fallback" },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem("author-hub-local-auth-user", JSON.stringify(user));
    localStorage.setItem("author-hub-local-auth-user-expires", String(Date.now() + 60 * 60 * 1000));
    sessionStorage.setItem("author-hub-session-auth-user", JSON.stringify(user));
  }, localUser);
  await page.goto("/");
  const enterWorkspace = page.getByRole("button", { name: /开始落墨/ });
  await enterWorkspace.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  if (await enterWorkspace.isVisible().catch(() => false)) await enterWorkspace.click();
  await page.locator(".novel-select-button").filter({ hasText: "新手视界 / 示例小说" }).waitFor();
  const closeTour = page.getByRole("button", { name: "关闭新手引导" });
  if (await closeTour.isVisible().catch(() => false)) await closeTour.click();
  const closeAnnouncement = page.getByRole("button", { name: "关闭公告提示" });
  if (await closeAnnouncement.isVisible().catch(() => false)) await closeAnnouncement.click();
  await page.locator(".novel-select-button").filter({ hasText: "新手视界 / 示例小说" }).click();
  await expect(page.locator(".novel-section")).toBeVisible();
});

test("phone author and user-center endings remain reachable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("phone"), "Mobile reachability is covered at both phone sizes.");

  await page.getByRole("button", { name: "用户中心" }).click();
  const announcementCenter = page.locator(".announcement-center-panel");
  await announcementCenter.scrollIntoViewIfNeeded();
  await expect(announcementCenter).toBeInViewport();

  await page.getByRole("button", { name: "作者主页" }).click();
  const disclaimer = page.locator(".global-disclaimer");
  await disclaimer.scrollIntoViewIfNeeded();
  await expect(disclaimer).toBeInViewport();
});

test("dismissed announcement ticker stays dismissed after refresh", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Persistence only needs one browser project.");
  await page.reload();
  await expect(page.getByRole("button", { name: "关闭公告提示" })).toHaveCount(0);
});

test("announcement center reveals history in pages of at most three", async ({ page }) => {
  await page.getByRole("button", { name: "用户中心" }).click();
  const center = page.locator(".announcement-center-panel");
  await center.scrollIntoViewIfNeeded();

  await expect(center.locator(".announcement-item")).toHaveCount(1);
  await center.getByRole("button", { name: "展开历史公告" }).click();
  const expandedCount = await center.locator(".announcement-item").count();
  expect(expandedCount).toBeGreaterThan(1);
  expect(expandedCount).toBeLessThanOrEqual(3);

  const pageLabel = center.locator(".announcement-pagination span");
  const pageMatch = (await pageLabel.innerText()).match(/^1 \/ (\d+) 页$/);
  expect(pageMatch).not.toBeNull();
  const totalPages = Number(pageMatch[1]);
  const previousPage = center.getByRole("button", { name: "上一页公告" });
  const nextPage = center.getByRole("button", { name: "下一页公告" });
  await expect(previousPage).toBeDisabled();

  if (totalPages > 1) {
    await nextPage.click();
    await expect(pageLabel).toHaveText(`2 / ${totalPages} 页`);
    expect(await center.locator(".announcement-item").count()).toBeLessThanOrEqual(3);
    await expect(previousPage).toBeEnabled();
    await previousPage.click();
  } else {
    await expect(nextPage).toBeDisabled();
  }

  if (process.env.CAPTURE_SCREENSHOTS) {
    await center.screenshot({ path: `output/playwright/announcement-center-${test.info().project.name}.png` });
  }

  await center.getByRole("button", { name: "收起历史公告" }).click();
  await expect(center.locator(".announcement-item")).toHaveCount(1);
});

test("workspace stays within every supported viewport", async ({ page }) => {
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  await expect(page.locator(".relation-svg")).toBeVisible();
  await expect(page.locator(".event-editor")).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/workspace-${test.info().project.name}.png`, fullPage: true });
  }
});

test("reading settings align and tool switches retain their behavior", async ({ page }) => {
  await page.getByRole("button", { name: "作者主页" }).click();
  const settings = page.locator(".appearance-panel");
  await settings.scrollIntoViewIfNeeded();
  const items = settings.locator(".appearance-setting-item");
  await expect(items).toHaveCount(4);
  const bottomBorders = await items.evaluateAll((settingItems) => settingItems.map((item) => getComputedStyle(item).borderBottomStyle));
  bottomBorders.forEach((borderStyle) => expect(borderStyle).toBe("none"));

  const titleIconColor = await settings.locator(".panel-title svg").evaluate((element) => getComputedStyle(element).color);
  const settingIconColors = await items.locator(".appearance-setting-label svg").evaluateAll((icons) => icons.map((icon) => getComputedStyle(icon).color));
  settingIconColors.forEach((color) => expect(color).toBe(titleIconColor));

  const musicBackground = await page.locator(".floating-music").evaluate((element) => getComputedStyle(element).backgroundColor);
  const musicChannels = musicBackground.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
  expect(musicChannels).toHaveLength(3);
  expect(Math.min(...musicChannels)).toBeGreaterThan(220);

  const rangeWidth = await settings.getByRole("slider").evaluate((element) => element.getBoundingClientRect().width);
  const selectWidth = await settings.locator("select").evaluate((element) => element.getBoundingClientRect().width);
  expect(rangeWidth).toBeGreaterThan(page.viewportSize().width <= 680 ? 110 : 175);
  expect(selectWidth).toBeGreaterThan(page.viewportSize().width <= 680 ? 130 : 215);

  const labelPositions = await items.locator(".appearance-setting-label").evaluateAll((labels) => labels.map((label) => Math.round(label.getBoundingClientRect().x)));
  if (page.viewportSize().width <= 680) {
    expect(new Set(labelPositions).size).toBe(1);
  } else {
    expect(labelPositions[0]).toBe(labelPositions[2]);
    expect(labelPositions[1]).toBe(labelPositions[3]);
  }

  await page.getByRole("switch", { name: "关闭音乐播放器" }).click();
  await expect(page.locator(".floating-music")).toHaveCount(0);
  await page.getByRole("switch", { name: "关闭草稿本" }).click();
  await expect(page.getByRole("button", { name: "打开草稿本" })).toHaveCount(0);

  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/reading-settings-${test.info().project.name}.png`, fullPage: true });
  }
});

test("editor workspaces stay inside every supported viewport", async ({ page }) => {
  const outline = page.locator(".story-card").filter({ hasText: "大纲" }).first();
  await outline.getByRole("button", { name: "专注编辑大纲" }).click();
  const zen = page.getByRole("dialog", { name: "大纲" });
  await expectElementInsideViewport(zen, page);
  await zen.getByRole("button", { name: "文本样式" }).click();
  const zenStyles = page.getByRole("toolbar", { name: "完整文本样式" });
  await expectElementInsideViewport(zenStyles, page);
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/focus-editor-${test.info().project.name}.png` });
  }
  await page.getByRole("button", { name: "关闭文本样式" }).click();
  await zen.getByRole("button", { name: "退出专注编辑" }).click();

  await page.getByRole("button", { name: "打开草稿本" }).click();
  const scratchpad = page.getByRole("dialog", { name: "草稿本" });
  await expectElementInsideViewport(scratchpad, page);
  await scratchpad.getByRole("tab", { name: "文本与样式" }).click();
  const scratchpadStyles = page.getByRole("toolbar", { name: "草稿本完整文本样式" });
  await expectElementInsideViewport(scratchpadStyles, page);
  await page.getByRole("button", { name: "关闭文本样式" }).click();
  await expect(scratchpad.locator(".scratchpad-rich-surface")).toHaveCSS("background-image", /repeating-linear-gradient/);
  await expect(scratchpad.locator(".scratchpad-rich-surface")).toHaveCSS("background-image", /linear-gradient/);
  await expect(scratchpad.locator(".scratchpad-rich-surface")).toHaveCSS("background-image", /texture-card-2/);
  await expect(scratchpad.locator(".scratchpad-rich-surface")).not.toHaveCSS("background-image", /texture-card-1/);
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/scratchpad-note-${test.info().project.name}.png` });
  }
  await scratchpad.getByRole("tab", { name: "思维图" }).click();
  await expect(scratchpad.locator(".scratchpad-map-tools")).toBeVisible();

  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/editor-workspaces-${test.info().project.name}.png`, fullPage: true });
  }
});

test("scratchpad uses the global reading theme in dark mode", async ({ page }) => {
  await page.getByRole("button", { name: "作者主页" }).click();
  await page.getByRole("button", { name: "夜间模式" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "打开草稿本" }).click();

  const scratchpad = page.getByRole("dialog", { name: "草稿本" });
  await expect(scratchpad).toBeVisible();
  await expect(scratchpad).toHaveCSS("background-color", "rgb(23, 43, 68)");
  await expect(scratchpad.locator(".scratchpad-rich-surface .ProseMirror")).toHaveCSS("color", "rgb(245, 248, 255)");
  await scratchpad.getByRole("tab", { name: "思维图" }).click();
  await expect(scratchpad.locator(".scratchpad-flow")).toHaveCSS("background-color", "rgb(23, 43, 68)");
});

test("tour demonstrates the outline focus editor instead of highlighting the timeline", async ({ page }) => {
  await page.getByRole("button", { name: "作者主页" }).click();
  await page.getByRole("button", { name: "重看引导" }).click();
  for (let index = 0; index < 5; index += 1) await page.getByRole("button", { name: "下一步" }).click();

  await expect(page.getByRole("heading", { name: "打开大纲专注编辑器" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "大纲", exact: true })).toBeVisible();
  await expect(page.locator(".tour-target-outline")).toHaveCount(1);
});

test("graph clicks sync the inspector, select A to B, and clear on blank space", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Detailed graph interaction runs once on desktop.");
  const svg = page.locator(".relation-svg");
  await expect(svg.locator(".graph-node")).toHaveCount(4);
  await page.waitForTimeout(1800);

  const nameInput = page.locator(".character-attribute-grid label").filter({ hasText: "姓名" }).locator("input");
  await nameInput.fill("尚未保存的测试名");
  await page.locator(".node-color-picker button").nth(4).click();
  await expect(nameInput).toHaveValue("尚未保存的测试名");
  await nameInput.fill("X");
  await page.getByRole("button", { name: /保存人物/ }).click();

  await svg.evaluate((element) => { element.dataset.sceneIdentity = "stable-scene"; });
  await svg.locator('[data-character-id="demo-y"]').click({ force: true });
  await expect(page.locator(".inspector-head h3")).toHaveText("Y");
  await expect(svg.locator('[data-character-id="demo-y"]')).toHaveAttribute("opacity", "1");

  const blankCanvas = svg.locator(".graph-hit-area");
  await blankCanvas.click({ position: { x: 24, y: 24 } });
  await expect(svg.locator('[data-character-id="demo-x"]')).toHaveAttribute("opacity", "1");
  await expect(svg.locator('[data-character-id="demo-y"]')).toHaveAttribute("opacity", "1");

  await svg.locator('[data-character-id="demo-x"]').click({ force: true });
  await expect(svg.locator('[data-character-id="demo-x"]')).toHaveAttribute("opacity", "1");
  await expect(svg.locator('[data-character-id="demo-y"]')).toHaveAttribute("opacity", "0.18");
  await svg.locator('[data-character-id="demo-y"]').click({ force: true });

  await expect(page.locator(".inspector-head h3")).toHaveText("X");
  await expect(page.getByText("锁定星球位置", { exact: true })).toHaveCount(0);
  await expect(page.locator(".connect-box select").nth(0)).toHaveValue("demo-x");
  await expect(page.locator(".connect-box select").nth(1)).toHaveValue("demo-y");
  await expect(svg).toHaveAttribute("data-scene-identity", "stable-scene");
  await expect(page.locator(".connect-box input")).toHaveValue("互相信任");
  await expect.poll(() => svg.locator(".graph-links path").evaluateAll((links) => (
    links.filter((link) => Number(link.getAttribute("stroke-opacity")) > 0).length
  ))).toBe(1);
  await expect(svg.locator('[data-character-id="demo-x"]')).toHaveAttribute("opacity", "1");
  await expect(svg.locator('[data-character-id="demo-y"]')).toHaveAttribute("opacity", "1");

  await blankCanvas.click({ position: { x: 24, y: 24 } });
  await expect(page.locator(".connect-box select").nth(0)).toHaveValue("");
  await expect(page.locator(".connect-box select").nth(1)).toHaveValue("");
  await expect(svg.locator('[data-character-id="demo-x"]')).toHaveAttribute("opacity", "1");
  await expect(svg.locator('[data-character-id="demo-y"]')).toHaveAttribute("opacity", "1");
});

test("rich text tools format content and protect unsaved focus edits", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Rich text interaction runs once on desktop.");

  const outline = page.locator(".story-card").filter({ hasText: "大纲" }).first();
  await expect(outline.getByRole("button", { name: "文本样式" })).toHaveCount(0);
  const compactEditor = outline.locator('[contenteditable="true"]');
  const compactSurface = outline.locator(".compact-rich-text-surface");
  await expect(compactSurface).toHaveCSS("overflow-y", "auto");
  await expect(compactSurface).toHaveCSS("resize", "vertical");
  await outline.getByRole("button", { name: "专注编辑大纲" }).click();
  const zen = page.getByRole("dialog", { name: "大纲" });
  await expect(zen).toBeVisible();
  const zenEditor = zen.locator('[contenteditable="true"]');
  await zenEditor.fill("需要加粗的重点");
  await zenEditor.press("Control+a");
  await zenEditor.press("Control+b");
  await zen.getByRole("button", { name: "文本样式" }).click();
  const zenStyles = page.getByRole("toolbar", { name: "完整文本样式" });
  await expect(zenStyles.locator(".text-style-grid")).toHaveCSS("grid-template-columns", /36px 36px 36px 36px 36px/);
  await zenStyles.getByRole("slider", { name: "文字字号" }).fill("22");
  await zen.getByRole("button", { name: "保存大纲" }).click();
  await expect(compactEditor.locator("strong")).toContainText("需要加粗的重点");
  await expect(compactEditor.locator('[style*="font-size: 22px"]')).toContainText("需要加粗的重点");
  await selectAllEditorText(compactEditor);
  await compactEditor.click({ button: "right" });
  await expect(page.getByRole("toolbar", { name: "选中文字快捷样式" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".novel-section").click({ position: { x: 8, y: 8 } });

  await outline.getByRole("button", { name: "专注编辑大纲" }).click();
  const discardZen = page.getByRole("dialog", { name: "大纲" });
  await discardZen.locator('[contenteditable="true"]').pressSequentially("尚未保存");
  await discardZen.getByRole("button", { name: "退出专注编辑" }).click();
  await expect(page.getByRole("dialog", { name: "要保存这次修改吗？" })).toBeVisible();
  await page.getByRole("button", { name: "取消并退出" }).click();
  await expect(discardZen).toHaveCount(0);
  await expect(compactEditor).not.toContainText("尚未保存");

  await outline.getByRole("button", { name: "专注编辑大纲" }).click();
  const reopenedZen = page.getByRole("dialog", { name: "大纲" });
  await reopenedZen.locator('[contenteditable="true"]').pressSequentially("保存后的排版");
  await reopenedZen.getByRole("button", { name: "退出专注编辑" }).click();
  await page.getByRole("button", { name: "保存并退出" }).click();
  await expect(compactEditor).toContainText("保存后的排版");
});

test("timeline media can collapse and scratchpad keeps note and map tools reachable", async ({ page }) => {

  const media = page.locator(".media-carousel-block").filter({ hasText: "时间线参考图片" });
  const collapse = media.getByRole("button", { name: "收起时间线参考图片" });
  if (await collapse.isVisible().catch(() => false)) {
    await collapse.click();
    await expect(media.getByRole("button", { name: "展开时间线参考图片" })).toBeVisible();
  }

  await page.getByRole("button", { name: "打开草稿本" }).click();
  const scratchpad = page.getByRole("dialog", { name: "草稿本" });
  await expect(scratchpad).toBeVisible();
  await scratchpad.getByRole("tab", { name: "文本与样式" }).click();
  await expect(page.getByRole("toolbar", { name: "草稿本完整文本样式" })).toBeVisible();
  await page.getByRole("button", { name: "关闭文本样式" }).click();
  await scratchpad.locator('[contenteditable="true"]').fill("一条不会丢失的灵感");
  await selectAllEditorText(scratchpad.locator('[contenteditable="true"]'));
  await scratchpad.locator('[contenteditable="true"]').click({ button: "right" });
  await expect(page.getByRole("toolbar", { name: "选中文字完整样式" })).toBeVisible();
  await page.getByRole("button", { name: "关闭文本样式" }).click();
  await expect.poll(() => readScratchpadHtml(page)).toContain("一条不会丢失的灵感");
  await scratchpad.getByRole("tab", { name: "思维图" }).click();
  await expect.poll(() => readScratchpadHtml(page)).toContain("一条不会丢失的灵感");
  await scratchpad.getByRole("button", { name: /根主题/ }).click();
  await expect(scratchpad.locator(".react-flow__node")).toHaveCount(1);
  await expect.poll(() => readScratchpadHtml(page)).toContain("一条不会丢失的灵感");
  await scratchpad.getByRole("button", { name: /子主题/ }).first().click();
  await expect(scratchpad.locator(".react-flow__node")).toHaveCount(2);
  await scratchpad.getByRole("button", { name: /横向重排/ }).click();
  await expect.poll(() => readScratchpadHtml(page)).toContain("一条不会丢失的灵感");
  await scratchpad.getByRole("button", { name: "关闭草稿本" }).click();
  await expect(scratchpad).toHaveCount(0);
  await expect.poll(() => readScratchpadHtml(page)).toContain("一条不会丢失的灵感");

  await page.getByRole("button", { name: "打开草稿本" }).click();
  const reopenedScratchpad = page.getByRole("dialog", { name: "草稿本" });
  await reopenedScratchpad.getByRole("tab", { name: "文本" }).click();
  await expect(reopenedScratchpad.locator('[contenteditable="true"]')).toContainText("一条不会丢失的灵感");

  if (test.info().project.name === "desktop") {
    await reopenedScratchpad.getByRole("button", { name: "关闭草稿本" }).click();
    await page.reload();
    await page.getByRole("button", { name: "打开草稿本" }).click();
    const refreshedScratchpad = page.getByRole("dialog", { name: "草稿本" });
    await refreshedScratchpad.getByRole("tab", { name: "文本" }).click();
    await expect(refreshedScratchpad.locator('[contenteditable="true"]')).toContainText("一条不会丢失的灵感");
  }
});

async function expectElementInsideViewport(locator, page) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function selectAllEditorText(locator) {
  await locator.focus();
  await locator.press("Control+a");
  await expect.poll(() => locator.evaluate(() => !window.getSelection()?.isCollapsed)).toBe(true);
}

async function readScratchpadHtml(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("author-hub-scratchpad-v1:"));
    return key ? JSON.parse(localStorage.getItem(key))?.note?.html ?? "" : "";
  });
}
