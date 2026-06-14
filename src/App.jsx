import React, { useEffect, useMemo, useState } from "react";
import { EyeOff, Sparkles, X } from "lucide-react";
import AuthGate from "./components/AuthGate.jsx";
import AuthorDashboard from "./components/AuthorDashboard.jsx";
import FloatingMusicPlayer from "./components/FloatingMusicPlayer.jsx";
import NovelSection from "./components/NovelSection.jsx";
import Sidebar from "./components/Sidebar.jsx";
import UserCenter from "./components/UserCenter.jsx";
import { getLocalAuthUser, hasSupabaseConfig, setLocalAuthUser, supabase } from "./lib/supabaseClient.js";
import { loadAuthorHubData, saveAuthorHubData } from "./lib/shimoAdapter.js";

const BOOK_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];

export default function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState("author");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(() => localStorage.getItem("author-hub-privacy-blur") === "true");

  const sidebarWidth = 224;

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
    if (authUser && !data) loadAuthorHubData(authUser).then(setData);
    if (!authUser) setData(null);
  }, [authUser, data]);

  useEffect(() => {
    const hour = new Date().getHours();
    document.body.dataset.ambient = hour >= 22 || hour < 6 ? "night" : hour >= 15 ? "afternoon" : "day";
  }, []);

  useEffect(() => {
    document.body.dataset.theme = data?.appearance?.darkMode ? "dark" : "light";
  }, [data?.appearance?.darkMode]);

  useEffect(() => {
    localStorage.setItem("author-hub-privacy-blur", String(privacyBlur));
  }, [privacyBlur]);

  useEffect(() => {
    if (data && authUser) saveAuthorHubData(data, authUser);
  }, [data, authUser]);

  useEffect(() => {
    if (!data || !justRegistered) return;
    const completed = Boolean(authUser?.user_metadata?.has_completed_tour);
    if (!completed) setTourStep(0);
  }, [data, justRegistered, authUser]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setPrivacyBlur((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  function selectView(id) {
    setActiveView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAuthor(author) {
    setData((current) => ({ ...current, author }));
  }

  async function logout() {
    if (hasSupabaseConfig && supabase) await supabase.auth.signOut();
    setLocalAuthUser(null);
    setAuthUser(null);
    setJustRegistered(false);
  }

  function updateNovel(novelId, patch) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) => (novel.id === novelId ? { ...novel, ...patch } : novel)),
    }));
  }

  function updateAppearance(patch) {
    setData((current) => ({
      ...current,
      appearance: { ...(current.appearance ?? appearance), ...patch },
    }));
  }

  function addCharacter(novelId, character) {
    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) =>
        novel.id === novelId ? { ...novel, characters: [...novel.characters, character] } : novel,
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
              characters: novel.characters.map((character) =>
                character.id === characterId ? { ...character, ...patch } : character,
              ),
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

  if (authReady && !authUser) {
    return (
      <>
        <AuthGate onAuthed={handleAuthed} />
        <div className="paper-texture-overlay" aria-hidden="true" />
      </>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="loading-orbit" />
        <p>{authReady ? "正在整理你的隐私创作空间..." : "正在确认安全会话..."}</p>
      </main>
    );
  }

  return (
    <div className={`app-shell ${privacyBlur ? "privacy-blur" : ""}`}>
      <Sidebar
        novels={novels}
        width={sidebarWidth}
        activeView={activeView}
        onSelect={selectView}
        onAddNovel={addNovel}
        onDeleteNovel={requestDeleteNovel}
      />
      <main
        className={`content-shell font-${appearance.fontFamily ?? "sans"}`}
        style={{ marginLeft: sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 14}px` }}
      >
        <div className="ambient-top" />
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
            onAddEvent={addEvent}
            onUpdateEvent={updateEvent}
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
      </main>
      <button type="button" className="privacy-float" onClick={() => setPrivacyBlur((current) => !current)} title="按 Esc 也可快速隐藏敏感内容">
        <EyeOff size={14} />
        {privacyBlur ? "恢复显示" : "隐私模糊"}
      </button>
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
          onSelectDemo={() => selectView(novels[0]?.id ?? "author")}
        />
      )}
      <div className="paper-texture-overlay" aria-hidden="true" />
    </div>
  );
}

const TOUR_STEPS = [
  {
    title: "\u5148\u770b\u8fd9\u91cc",
    text: "\u4ece\u300a\u65b0\u624b\u89c6\u754c\u300b\u8fdb\u5165\u793a\u4f8b\u5c0f\u8bf4\uff0c\u5148\u719f\u6089\u661f\u56fe\u3001\u65f6\u95f4\u7ebf\u548c\u53d1\u5e03\u9875\u914d\u7f6e\u3002",
    target: "demo-novel",
    arrow: "left",
  },
  {
    title: "\u4eba\u7269\u661f\u56fe",
    text: "\u70b9\u51fb\u8282\u70b9\u5373\u53ef\u5b9e\u65f6\u8fde\u7ebf\u4e92\u52a8",
    target: "relation-graph",
    arrow: "down",
  },
  {
    title: "\u4eba\u7269\u8be6\u60c5",
    text: "\u9009\u4e2d\u661f\u7403\u540e\uff0c\u5728\u8fd9\u91cc\u7f16\u8f91\u4eba\u7269\u3001\u6807\u7b7e\u3001\u56fe\u7247\u548c\u5173\u7cfb\u3002",
    target: "detail-panel-head",
    arrow: "right",
  },
  {
    title: "\u7528\u6237\u4e2d\u5fc3",
    text: "\u8d26\u53f7\u5b89\u5168\u3001\u5bfc\u51fa\u3001\u6e05\u7a7a\u3001\u767b\u51fa\u548c\u6253\u8d4f\u90fd\u6536\u5728\u8fd9\u91cc\u3002",
    target: "user-center-nav",
    arrow: "up",
  },
];

function TourProvider({ step, setStep, onDone, onSelectDemo }) {
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0];
  const isLast = step >= TOUR_STEPS.length - 1;
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const selector = current.target === "relation-graph" ? ".relation-graph" : '[data-tour="' + current.target + '"]';
    let attempts = 0;
    let timer;

    function locate() {
      const element = document.querySelector(selector);
      if (!element && attempts < 12) {
        attempts += 1;
        timer = window.setTimeout(locate, 180);
        return;
      }
      if (!element) {
        setRect({ top: 120, left: 300, width: 220, height: 64 });
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      timer = window.setTimeout(() => {
        const box = element.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      }, 560);
    }

    locate();
    return () => window.clearTimeout(timer);
  }, [current.target, step]);

  useEffect(() => {
    function updateRect() {
      const selector = current.target === "relation-graph" ? ".relation-graph" : '[data-tour="' + current.target + '"]';
      const element = document.querySelector(selector);
      if (!element) return;
      const box = element.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    }
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [current.target, step]);

  function next() {
    if (step === 0) {
      onSelectDemo();
      window.setTimeout(() => setStep(step + 1), 240);
      return;
    }
    if (isLast) onDone();
    else setStep(step + 1);
  }

  if (!rect) return null;

  const bubbleWidth = 270;
  const left =
    current.arrow === "right"
      ? Math.max(18, rect.left - bubbleWidth - 22)
      : current.arrow === "down"
        ? Math.min(window.innerWidth - bubbleWidth - 18, Math.max(18, rect.left + rect.width / 2 - bubbleWidth / 2))
        : Math.min(window.innerWidth - bubbleWidth - 18, Math.max(18, rect.left + rect.width + 22));
  const top =
    current.arrow === "down"
      ? Math.max(18, rect.top + rect.height / 2 - 42)
      : Math.max(18, Math.min(window.innerHeight - 150, rect.top + rect.height / 2 - 44));

  return (
    <div className="glow-tour-layer" aria-live="polite">
      <section className={"glow-tour-bubble tour-provider-bubble arrow-" + (current.arrow ?? "right")} style={{ "--tour-top": top + "px", "--tour-left": left + "px" }}>
        <span className="glow-arrow">{arrowSymbol(current.arrow)}</span>
        <div>
          <strong>{current.title}</strong>
          <p>{current.text}</p>
          <div className="glow-tour-actions">
            <button type="button" onClick={onDone}>{"\u8df3\u8fc7 (Skip)"}</button>
            <button type="button" onClick={next}>{isLast ? "\u5b8c\u6210" : "\u77e5\u9053\u4e86 (Next)"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function arrowSymbol(direction = "right") {
  return { right: "\u2b05\ufe0f", down: "\u2b07\ufe0f", left: "\u27a1\ufe0f", up: "\u2b06\ufe0f" }[direction] ?? "\u27a1\ufe0f";
}

function createBlankNovel(id, index) {
  const color = BOOK_COLORS[(index - 1) % BOOK_COLORS.length];
  return {
    id,
    title: `新小说 ${index}`,
    subtitle: "在这里写一句温柔、清晰的副标题",
    color,
    accent: "#DDA96A",
    genre: "原创 / 待定",
    currentWords: 0,
    targetWords: 120000,
    finishDate: "2027-12-31",
    urls: { ao3: "", jjwxc: "", qidian: "", qimao: "", fanqie: "", changpei: "" },
    sourceLinks: [{ label: "AO3", url: "" }],
    outline: "在这里整理故事大纲。",
    setting: "在这里整理世界观、空间、组织和物件设定。",
    themes: ["新故事"],
    characters: [
      {
        id: `${id}-character-1`,
        name: "新人物",
        age: 20,
        role: "待定",
        tag: "主要配角",
        color,
        background: "补充人物背景。",
        secret: "补充隐藏设定。",
        images: [],
      },
    ],
    relationships: [],
    timeline: [
      {
        id: `${id}-event-1`,
        date: "起点",
        title: "故事开始",
        background: "补充事件发生前的背景。",
        plot: "补充这个事件如何推动人物选择。",
        images: [],
      },
    ],
  };
}

function timelineRank(event) {
  if (Number.isFinite(event.rank)) return event.rank;
  const text = `${event.date ?? ""} ${event.title ?? ""}`;
  const age = text.match(/(\d+)\s*岁/);
  if (age) return Number(age[1]) * 100;
  const chapter = text.match(/第\s*(\d+)\s*章/);
  if (chapter) return 10000 + Number(chapter[1]);
  const year = text.match(/(\d{2,4})\s*年/);
  if (year) return Number(year[1]);
  if (/童年/.test(text)) return 100;
  if (/少年|高中/.test(text)) return 1500;
  if (/大学/.test(text)) return 2200;
  return 999999;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildMarkdownExport(data) {
  const lines = [`# AuthorHub Export`, "", `导出时间：${new Date().toLocaleString()}`, ""];
  for (const novel of data.novels ?? []) {
    lines.push(`## ${novel.title}`, "", novel.subtitle ?? "", "", `类型：${novel.genre ?? ""}`, `字数：${novel.currentWords ?? 0} / ${novel.targetWords ?? 0}`, "");
    lines.push(`### 大纲`, "", novel.outline ?? "", "", `### 设定集`, "", novel.setting ?? "", "");
    lines.push(`### 人物`, "");
    for (const character of novel.characters ?? []) {
      lines.push(`- **${character.name}**：${character.role ?? ""} / ${character.tag ?? ""}`);
    }
    lines.push("", `### 时间线`, "");
    for (const event of novel.timeline ?? []) {
      lines.push(`- **${event.date}｜${event.title}**：${event.plot ?? ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
