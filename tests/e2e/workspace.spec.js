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
  }, localUser);
  await page.goto("/");
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

test("character draft survives color selection and A to B keeps A in the inspector", async ({ page }, testInfo) => {
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
  await svg.locator('[data-character-id="demo-x"]').dispatchEvent("click");
  await svg.locator('[data-character-id="demo-y"]').dispatchEvent("click");

  await expect(page.locator(".inspector-head h3")).toHaveText("X");
  await expect(page.locator(".connect-box select").nth(0)).toHaveValue("demo-x");
  await expect(page.locator(".connect-box select").nth(1)).toHaveValue("demo-y");
  await expect(svg).toHaveAttribute("data-scene-identity", "stable-scene");
  await expect(svg.locator(".graph-relationship-preview")).toBeVisible();
});
