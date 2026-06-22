import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import FloatingMusicPlayer from "./components/FloatingMusicPlayer.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TourProvider from "./components/TourProvider.jsx";
import { getLocalAuthUser, hasSupabaseConfig, setLocalAuthUser, supabase } from "./lib/supabaseClient.js";
import { flushCloudSave, loadAuthorHubData, saveAuthorHubData } from "./lib/shimoAdapter.js";

const AuthGate = lazy(() => import("./components/AuthGate.jsx"));
const AuthorDashboard = lazy(() => import("./components/AuthorDashboard.jsx"));
const LandingGateway = lazy(() => import("./components/LandingGateway.jsx"));
const NovelSection = lazy(() => import("./components/NovelSection.jsx"));
const UserCenter = lazy(() => import("./components/UserCenter.jsx"));

const BOOK_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];
const ESCAPE_BLOCKING_SELECTOR = ".modal-backdrop, .zen-overlay, .logo-lightbox-overlay, .publish-popover";
const TEXT_ENTRY_SELECTOR = "input, textarea, select, [contenteditable='true']";
const THEME_MODE_KEY = "author-hub-theme-mode";

export default function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("author");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(() => localStorage.getItem("author-hub-privacy-blur") === "true");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? "72px" : "clamp(184px, 15vw, 224px)";

  useEffect(() => {
    let mounted = true;
    let cleanup;

    async function boot() {
      if (hasSupabaseConfig && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (mounted) setAuthUser(sessionData.session?.user ?? null);
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setAuthUser(session?.user ?? null);
        });
        cleanup = () => listener.subscription.unsubscribe();
      } else if (mounted) {
        setAuthUser(getLocalAuthUser());
      }

      if (mounted) setAuthReady(true);
    }

    boot();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    if (authUser && !data) {
      loadAuthorHubData(authUser).then((loadedData) => {
        const storedTheme = getStoredThemeMode();
        if (!storedTheme) return setData(loadedData);
        setData({
          ...loadedData,
          appearance: {
            ...loadedData.appearance,
            darkMode: storedTheme === "dark",
          },
        });
      });
    }
    if (!authUser) setData(null);
  }, [authUser, data]);

  useEffect(() => {
    const hour = new Date().getHours();
    document.body.dataset.ambient = hour >= 22 || hour < 6 ? "night" : hour >= 15 ? "afternoon" : "day";
  }, []);

  useEffect(() => {
    const storedTheme = getStoredThemeMode();
    const darkMode = data?.appearance?.darkMode ?? storedTheme === "dark";
    document.body.dataset.theme = darkMode ? "dark" : "light";
  }, [data?.appearance?.darkMode]);

  useEffect(() => {
    localStorage.setItem("author-hub-privacy-blur", String(privacyBlur));
  }, [privacyBlur]);

  useEffect(() => {
    if (data && authUser) saveAuthorHubData(data, authUser);
  }, [data, authUser]);

  useEffect(() => {
    function flushOnHide() {
      if (document.visibilityState === "hidden") flushCloudSave();
    }
    window.addEventListener("beforeunload", flushCloudSave);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("beforeunload", flushCloudSave);
      document.removeEventListener("visibilitychange", flushOnHide);
      flushCloudSave();
    };
  }, []);

  useEffect(() => {
    if (!data || !justRegistered) return;
    const completed = Boolean(authUser?.user_metadata?.has_completed_tour);
    if (!completed) setTourStep(0);
  }, [data, justRegistered, authUser]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      if (deleteCandidate) {
        event.preventDefault();
        setDeleteCandidate(null);
        return;
      }

      if (tourStep !== null) {
        event.preventDefault();
        finishTour();
        return;
      }

      if (document.querySelector(ESCAPE_BLOCKING_SELECTOR)) return;
      if (document.activeElement?.closest?.(TEXT_ENTRY_SELECTOR)) return;

      setPrivacyBlur((current) => !current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteCandidate, tourStep]);

  const novels = useMemo(() => data?.novels ?? [], [data]);
  const activeNovel = useMemo(() => novels.find((novel) => novel.id === activeView), [activeView, novels]);
  const appearance = data?.appearance ?? { fontFamily: "sans", fontSize: 14 };

  function handleAuthed(user, meta = {}) {
    if (meta.isNew) {
      localStorage.removeItem("ah_tour");
      localStorage.removeItem("author-hub-tour-complete");
    }
    setJustRegistered(Boolean(meta.isNew));
    setAuthUser(user);
  }

  async function logout() {
    if (hasSupabaseConfig && supabase) {
      await flushCloudSave();
      await supabase.auth.signOut();
    } else {
      setLocalAuthUser(null);
    }
    setAuthUser(null);
    setData(null);
    setActiveView("author");
  }

  const selectView = useCallback((viewId) => {
    setActiveView(viewId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function updateAuthor(nextAuthor) {
    setData((current) => ({ ...current, author: nextAuthor }));
  }

  function updateAppearance(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "darkMode")) {
      storeThemeMode(patch.darkMode ? "dark" : "light");
    }
    setData((current) => ({
      ...current,
      appearance: { ...current.appearance, ...patch },
    }));
  }

  function updateNovel(novelId, patch) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) => (novel.id === novelId ? { ...novel, ...patch } : novel)),
    }));
  }

  function addCharacter(novelId, character) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId
          ? {
              ...novel,
              characters: [...novel.characters, character],
            }
          : novel,
      ),
    }));
  }

  function updateCharacter(novelId, characterId, patch) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId
          ? {
              ...novel,
              characters: novel.characters.map((character) => (character.id === characterId ? { ...character, ...patch } : character)),
            }
          : novel,
      ),
    }));
  }

  function deleteCharacter(novelId, characterId) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId
          ? {
              ...novel,
              characters: novel.characters.filter((character) => character.id !== characterId),
              relationships: (novel.relationships ?? []).filter((relationship) => {
                const sourceId = getRelationshipEndpointId(relationship.source);
                const targetId = getRelationshipEndpointId(relationship.target);
                return sourceId !== characterId && targetId !== characterId;
              }),
            }
          : novel,
      ),
    }));
  }

  function addRelationship(novelId, relationship) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId ? { ...novel, relationships: [...(novel.relationships ?? []), relationship] } : novel,
      ),
    }));
  }

  function updateRelationship(novelId, relationshipIndex, patch) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId
          ? {
              ...novel,
              relationships: (novel.relationships ?? []).map((relationship, index) =>
                index === relationshipIndex ? { ...relationship, ...patch } : relationship,
              ),
            }
          : novel,
      ),
    }));
  }

  function addNovel() {
    const index = (data.novels?.length ?? 0) + 1;
    const id = `novel-${Date.now()}`;
    const novel = createBlankNovel(id, index);

    setData((current) => ({ ...current, novels: [...current.novels, novel] }));
    setActiveView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearAllUserData() {
    setData((current) => ({
      ...current,
      novels: [],
      author: {
        ...current.author,
        hasCompletedTour: true,
      },
    }));
    localStorage.setItem("author-hub-tour-complete", "true");
    setActiveView("author");
  }

  function exportJsonData() {
    downloadText(`author-hub-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  function exportMarkdownData() {
    const markdown = buildMarkdownExport(data);
    downloadText(`author-hub-export-${new Date().toISOString().slice(0, 10)}.md`, markdown, "text/markdown;charset=utf-8");
  }

  async function finishTour() {
    localStorage.setItem("ah_tour", "true");
    localStorage.setItem("author-hub-tour-complete", "true");
    if (hasSupabaseConfig && supabase) {
      supabase.auth.updateUser({ data: { has_completed_tour: true } }).catch((error) => {
        console.warn("Tour metadata sync failed", error);
      });
    }
    setData((current) => ({
      ...current,
      author: { ...current.author, hasCompletedTour: true },
    }));
    setTourStep(null);
    setJustRegistered(false);
  }

  function requestDeleteNovel(novelId) {
    const novel = novels.find((item) => item.id === novelId);
    if (novel) setDeleteCandidate(novel);
  }

  function confirmDeleteNovel() {
    if (!deleteCandidate) return;
    const remainingNovels = novels.filter((novel) => novel.id !== deleteCandidate.id);
    const nextActiveView = activeView === deleteCandidate.id ? remainingNovels[0]?.id ?? "author" : activeView;
    setData((current) => ({ ...current, novels: current.novels.filter((novel) => novel.id !== deleteCandidate.id) }));
    setActiveView(nextActiveView);
    setDeleteCandidate(null);
  }

  function addEvent(novelId, event) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId ? { ...novel, timeline: [...novel.timeline, event].sort((a, b) => timelineRank(a) - timelineRank(b)) } : novel,
      ),
    }));
  }

  function updateEvent(novelId, eventId, patch) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId
          ? { ...novel, timeline: novel.timeline.map((event) => (event.id === eventId ? { ...event, ...patch } : event)) }
          : novel,
      ),
    }));
  }

  function deleteEvent(novelId, eventId) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) => (novel.id === novelId ? { ...novel, timeline: novel.timeline.filter((event) => event.id !== eventId) } : novel)),
    }));
  }

  if (authReady && !authUser) {
    return (
      <Suspense fallback={<LandingShellFallback />}>
        <LandingGateway>
          <AuthGate onAuthed={handleAuthed} />
        </LandingGateway>
      </Suspense>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen" aria-label="正在整理隐私空间中">
        <div className="privacy-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>正在整理隐私空间中</p>
      </main>
    );
  }

  return (
    <div
      className={`app-shell ${privacyBlur ? "privacy-blur" : ""} ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}
      style={{ "--sidebar-current-width": sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 14}px` }}
    >
      <Sidebar
        novels={novels}
        width={sidebarWidth}
        activeView={activeView}
        appearance={appearance}
        collapsed={sidebarCollapsed}
        onSelect={selectView}
        onAddNovel={addNovel}
        onDeleteNovel={requestDeleteNovel}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main
        className={`content-shell font-${appearance.fontFamily ?? "sans"}`}
        style={{ marginLeft: sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 14}px` }}
      >
        <Suspense fallback={null}>
          {activeView === "author" && (
            <AuthorDashboard
              author={data.author}
              novels={novels}
              appearance={appearance}
              privacyBlur={privacyBlur}
              onAuthorChange={updateAuthor}
              onAppearanceChange={updateAppearance}
              onPrivacyBlurChange={setPrivacyBlur}
            />
          )}
          {activeView === "user" && (
            <UserCenter
              authUser={authUser}
              author={data.author}
              onAuthorChange={updateAuthor}
              onExportJson={exportJsonData}
              onExportMarkdown={exportMarkdownData}
              onClearData={clearAllUserData}
              onLogout={logout}
              appearance={appearance}
              onAppearanceChange={updateAppearance}
            />
          )}
          {activeNovel ? (
            <NovelSection
              key={activeNovel.id}
              novel={activeNovel}
              onNovelChange={updateNovel}
              onAddCharacter={addCharacter}
              onUpdateCharacter={updateCharacter}
              onAddRelationship={addRelationship}
              onUpdateRelationship={updateRelationship}
              onDeleteCharacter={deleteCharacter}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onDeleteEvent={deleteEvent}
            />
          ) : activeView !== "author" && activeView !== "user" ? (
            <section className="section empty-state">
              <Sparkles size={22} />
              <h2>这里还没有小说</h2>
              <p>点击左侧的“新增小说”，创建你的第一组人物星图、时间线和设定集。</p>
              <button type="button" className="primary-button compact-action" onClick={addNovel}>
                新增小说
              </button>
            </section>
          ) : null}
        </Suspense>
      </main>
      <FloatingMusicPlayer />
      {deleteCandidate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-novel-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Delete novel</p>
            <h2 id="delete-novel-title">是否确定删除该小说？</h2>
            <p>该操作将永久清空《{deleteCandidate.title}》相关的全部星图、人物卡片及设定数据。</p>
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteCandidate(null)}>
                取消
              </button>
              <button type="button" className="danger-button" onClick={confirmDeleteNovel}>
                确定删除
              </button>
            </div>
          </section>
        </div>
      )}
      {tourStep !== null && (
        <TourProvider
          step={tourStep}
          setStep={setTourStep}
          onDone={finishTour}
          onSelectView={selectView}
          demoNovelId={novels[0]?.id ?? "author"}
        />
      )}
    </div>
  );
}

function LandingShellFallback() {
  return (
    <main
      aria-label="正在打开 AuthorHub"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 70% 46%, rgba(242, 153, 74, 0.16), transparent 24%), linear-gradient(135deg, #0f1317 0%, #12161a 48%, #171214 100%)",
      }}
    />
  );
}

function createBlankNovel(id, index) {
  return {
    id,
    title: `新小说 ${index}`,
    subtitle: "一句话写下这本书的灵魂。",
    genre: "类型未定",
    color: BOOK_COLORS[index % BOOK_COLORS.length],
    accent: "#F6E7D5",
    currentWords: 0,
    targetWords: 100000,
    finishDate: "2026-12-31",
    outline: "写下主线、转折点、核心冲突与结局方向。",
    setting: "写下世界观、时代背景、规则系统、地理空间与重要道具。",
    themes: ["成长", "羁绊"],
    characters: [],
    relationships: [],
    timeline: [],
    sourceLinks: [],
  };
}

function timelineRank(event) {
  const parsed = Date.parse(event.date);
  if (!Number.isNaN(parsed)) return parsed;
  return String(event.date ?? "").localeCompare("");
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildMarkdownExport(data) {
  const sections = [`# AuthorHub Export`, ``, `## 作者`, `- 笔名：${data.author.pseudonym}`, `- 年龄：${data.author.age}`, `- 更新频率：${data.author.updateFrequency}`, `- 首发平台：${data.author.platform}`, ``];

  data.novels.forEach((novel) => {
    sections.push(`## ${novel.title}`, `_${novel.subtitle}_`, ``, `- 类型：${novel.genre}`, `- 当前字数：${novel.currentWords}`, `- 预计总字数：${novel.targetWords}`, `- 完结时间：${novel.finishDate}`, ``);
    sections.push(`### 大纲`, novel.outline, ``, `### 设定集`, novel.setting, ``);
    sections.push(`### 主题`, ...(novel.themes ?? []).map((theme) => `- ${theme}`), ``);
    sections.push(`### 人物`, ...(novel.characters ?? []).map((character) => `- ${character.name}：${character.archetype}`), ``);
    sections.push(`### 关系`, ...(novel.relationships ?? []).map((relationship) => `- ${relationship.source} → ${relationship.target}：${relationship.label}`), ``);
    sections.push(`### 时间线`, ...(novel.timeline ?? []).map((event) => `- ${event.date}｜${event.title}`), ``);
  });

  return sections.join("\n");
}

function getRelationshipEndpointId(endpoint) {
  return typeof endpoint === "object" ? endpoint?.id : endpoint;
}

function getStoredThemeMode() {
  try {
    const mode = localStorage.getItem(THEME_MODE_KEY);
    return mode === "dark" || mode === "light" ? mode : null;
  } catch {
    return null;
  }
}

function storeThemeMode(mode) {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Theme persistence is a local preference only.
  }
}
