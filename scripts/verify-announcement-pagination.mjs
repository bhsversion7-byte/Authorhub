import assert from "node:assert/strict";
import * as announcementData from "../src/data/announcements.js";

assert.equal(
  typeof announcementData.getAnnouncementPage,
  "function",
  "announcement data must expose deterministic pagination",
);

const sample = Array.from({ length: 8 }, (_, index) => ({ id: `announcement-${index + 1}` }));
const secondPage = announcementData.getAnnouncementPage(sample, 1);
assert.deepEqual(secondPage.items.map((item) => item.id), ["announcement-4", "announcement-5", "announcement-6"]);
assert.equal(secondPage.page, 1);
assert.equal(secondPage.totalPages, 3);

const clampedPage = announcementData.getAnnouncementPage(sample, 99);
assert.equal(clampedPage.page, 2);
assert.deepEqual(clampedPage.items.map((item) => item.id), ["announcement-7", "announcement-8"]);

const emptyPage = announcementData.getAnnouncementPage([], -5);
assert.deepEqual(emptyPage, { items: [], page: 0, totalPages: 1 });

console.log("Announcement pagination checks passed.");
