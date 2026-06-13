import React from "react";
import { useEffect, useMemo, useState } from "react";
import { EyeOff, SkipForward, Sparkles, X } from "lucide-react";
import AuthorDashboard from "./components/AuthorDashboard.jsx";
import NovelSection from "./components/NovelSection.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { loadAuthorHubData, resetAuthorHubData, saveAuthorHubData } from "./lib/shimoAdapter.js";

export default function App() {
  const [data, setData] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(292);
  const [activeView, setActiveView] = useState("author");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [privacyBlur, setPrivacyBlur] = useState(() => localStorage.getItem("author-hub-privacy-blur") === "true");

  useEffect(() => {
    loadAuthorHubData().then(setData);
  }, []);

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
    if (data) saveAuthorHubData(data);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const completed = data.author?.hasCompletedTour || localStorage.getItem("author-hub-tour-complete") === "true";
    if (!completed) setTourStep(0);
  }, [data]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setPrivacyBlur((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const novels = useMemo(() => data?.novels ?? [], [data]);
  const activeNovel = useMemo(() => novels.find((novel) => novel.id === activeView), [activeView, novels]);
  const appearance = data?.appearance ?? { fontFamily: "sans", fontSize: 17 };

  function selectView(id) {
    setActiveView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAuthor(author) {
    setData((current) => ({ ...current, author }));
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
    const novel = {
      id,
      title: `新小说 ${index}`,
      subtitle: "在这里写一句温柔的副标题",
      color: "#8BA09C",
      accent: "#DDA96A",
      genre: "原创 / 待定",
      currentWords: 0,
      targetWords: 120000,
      finishDate: "2027-12-31",
      urls: { ao3: "" },
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
          tag: "主角1",
          color: "#8BA09C",
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

  function exportUserData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `author-hub-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function finishTour() {
    localStorage.setItem("author-hub-tour-complete", "true");
    setData((current) => ({
      ...current,
      author: { ...current.author, hasCompletedTour: true },
    }));
    setTourStep(null);
  }

  function requestDeleteNovel(novelId) {
    const novel = novels.find((item) => item.id === novelId);
    if (novel) setDeleteCandidate(novel);
  }

  function confirmDeleteNovel() {
    if (!deleteCandidate) return;
    const remainingNovels = novels.filter((novel) => novel.id !== deleteCandidate.id);
    const nextActiveView = activeView === deleteCandidate.id ? remainingNovels[0]?.id ?? "author" : activeView;
    setData((current) => {
      return { ...current, novels: current.novels.filter((novel) => novel.id !== deleteCandidate.id) };
    });
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

  function resetData() {
    resetAuthorHubData();
    loadAuthorHubData().then(setData);
  }

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="loading-orbit" />
        <p>正在整理示例创作空间...</p>
      </main>
    );
  }

  return (
    <div className={`app-shell ${privacyBlur ? "privacy-blur" : ""}`}>
      <Sidebar
        novels={novels}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
        activeView={activeView}
        onSelect={selectView}
        onAddNovel={addNovel}
        onDeleteNovel={requestDeleteNovel}
        onReset={resetData}
      />
      <main
        className={`content-shell font-${appearance.fontFamily ?? "sans"}`}
        style={{ marginLeft: sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 17}px` }}
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
            onExportData={exportUserData}
            onClearData={clearAllUserData}
            onResetDemo={resetData}
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
        ) : activeView !== "author" ? (
          <section className="section empty-state">
            <Sparkles size={30} />
            <h2>这里还没有小说</h2>
            <p>点击左侧的“新增小说”，创建你的第一组人物星图、时间线和设定集。</p>
            <button type="button" className="primary-button compact-action" onClick={addNovel}>
              新增小说
            </button>
          </section>
        ) : null}
        {novels.length === 0 && activeView === "author" && (
          <section className="section empty-state" data-tour="add-novel">
            <Sparkles size={30} />
            <h2>这里空空如也</h2>
            <p>点击左侧下方的“新增小说”，创建你的第一个宇宙。</p>
            <button type="button" className="primary-button compact-action" onClick={addNovel}>
              新增小说
            </button>
          </section>
        )}
      </main>
      <button type="button" className="privacy-float" onClick={() => setPrivacyBlur((current) => !current)} title="按 Esc 也可快速隐藏敏感内容">
        <EyeOff size={16} />
        {privacyBlur ? "恢复显示" : "隐私模糊"}
      </button>
      {deleteCandidate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-novel-title" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Delete novel</p>
            <h2 id="delete-novel-title">是否确定删除该小说？</h2>
            <p>
              该操作将永久清空《{deleteCandidate.title}》相关的全部星图、人物卡片及设定数据。
            </p>
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
        <OnboardingTour
          step={tourStep}
          setStep={setTourStep}
          onDone={finishTour}
          onSelectDemo={() => selectView(novels[0]?.id ?? "author")}
        />
      )}
    </div>
  );
}

const TOUR_STEPS = [
  {
    title: "欢迎来到 Author Hub",
    text: "系统已为你生成一本示例小说，方便快速熟悉星图、时间线、设定集和发布页跳转。",
  },
  {
    title: "人物关系星图",
    text: "点击人物星球可以编辑角色；点击两个人物之间的关系标签，可以直接修改关系文本。",
  },
  {
    title: "个人中心与隐私",
    text: "这里可以编辑作者信息、导出或清空数据、切换深色模式，也可以开启一键隐私模糊。",
  },
  {
    title: "开始自己的作品",
    text: "理解示例后，点击左侧“新增小说”，就能创建真正属于你的作品空间。",
  },
];

function OnboardingTour({ step, setStep, onDone, onSelectDemo }) {
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0];
  const isLast = step >= TOUR_STEPS.length - 1;

  function next() {
    if (step === 0) onSelectDemo();
    if (isLast) onDone();
    else setStep(step + 1);
  }

  return (
    <div className="tour-backdrop">
      <section className="tour-card" role="dialog" aria-modal="true" aria-label="新手引导">
        <button type="button" className="tour-close" onClick={onDone} aria-label="跳过引导">
          <X size={16} />
        </button>
        <p className="eyebrow">Step {step + 1} / {TOUR_STEPS.length}</p>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        <div className="tour-actions">
          <button type="button" className="ghost-button" onClick={onDone}>
            <SkipForward size={15} />
            跳过引导
          </button>
          <button type="button" className="primary-button" onClick={next}>
            {isLast ? "完成" : "下一步"}
          </button>
        </div>
      </section>
    </div>
  );
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
