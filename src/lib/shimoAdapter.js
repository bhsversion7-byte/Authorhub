import { mockAuthorHubData } from "../data/mockData.js";

const STORAGE_KEY = "author-hub-shimo-cache-v3";

export async function loadAuthorHubData() {
  const cached = window.localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const migrated = migrateData(JSON.parse(cached));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  const data = migrateData(await fetchFromShimoOrMock());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function saveAuthorHubData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Author Hub local cache is full; latest large media changes may not persist.", error);
  }
}

export function resetAuthorHubData() {
  window.localStorage.removeItem(STORAGE_KEY);
}

async function fetchFromShimoOrMock() {
  return mockAuthorHubData;
}

function migrateData(data) {
  const novels = (data.novels?.length ? data.novels : mockAuthorHubData.novels).map((novel) => ({
    ...novel,
    characters: (novel.characters ?? []).map((character, index) => ({
      ...character,
      tag: character.tag ?? character.faction ?? inferCharacterTag(character, index),
      color: character.color ?? ["#8BA09C", "#DDA96A", "#A9A084", "#BFA57B", "#A7B8C8"][index % 5],
      images: character.images ?? [],
    })),
    timeline: (novel.timeline ?? []).map((event) => ({ ...event, images: event.images ?? [] })),
  }));
  return {
    ...mockAuthorHubData,
    ...data,
    author: { ...mockAuthorHubData.author, ...(data.author ?? {}) },
    shimoFolders: data.shimoFolders?.length ? data.shimoFolders : mockAuthorHubData.shimoFolders,
    novels,
  };
}

function inferCharacterTag(character, index) {
  if (index === 0 || /攻/.test(character.role ?? "")) return "主角攻";
  if (index === 1 || /受/.test(character.role ?? "")) return "主角受";
  return "主要配角";
}

export const shimoConnection = {
  provider: "Document Connector",
  mode: "mock",
  desktopUrl: "",
  notes:
    "这里预留文档 API/导出文件接入。拿到授权后，可把文件夹、文档正文和表格字段映射为 novels / characters / timelines。",
};
