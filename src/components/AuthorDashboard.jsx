import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CaseSensitive, EyeOff, Feather, Library, Moon, PenLine, Type } from "lucide-react";
import EditableField from "./EditableField.jsx";

export default function AuthorDashboard({
  author,
  novels,
  appearance,
  privacyBlur,
  onAuthorChange,
  onAppearanceChange,
  onPrivacyBlurChange,
}) {
  const totalCurrent = novels.reduce((sum, novel) => sum + Number(novel.currentWords || 0), 0);
  const totalTarget = novels.reduce((sum, novel) => sum + Number(novel.targetWords || 0), 0);
  const totalProgress = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const safeAuthor = useMemo(() => ({ ...author }), [author]);
  const sectionRef = useRef(null);
  const [topLift, setTopLift] = useState(0);

  useLayoutEffect(() => {
    function alignAuthorSection() {
      const section = sectionRef.current;
      if (!section) return;

      section.style.setProperty("--author-top-lift", "0px");
      const desiredTop = window.innerWidth <= 680 ? 12 : 18;
      const currentTop = section.getBoundingClientRect().top;
      const nextLift = Math.max(0, Math.min(280, Math.round(currentTop - desiredTop)));
      section.style.setProperty("--author-top-lift", `${nextLift}px`);
      setTopLift(nextLift);
    }

    const frame = window.requestAnimationFrame(alignAuthorSection);
    window.addEventListener("resize", alignAuthorSection);
    window.addEventListener("orientationchange", alignAuthorSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", alignAuthorSection);
      window.removeEventListener("orientationchange", alignAuthorSection);
    };
  }, []);

  function patchAuthor(patch) {
    onAuthorChange({ ...safeAuthor, ...patch });
  }

  return (
    <section id="author" ref={sectionRef} className="section author-section" style={{ "--author-top-lift": `${topLift}px` }}>
      <div className="section-heading">
        <p className="eyebrow">Author profile</p>
        <h1>作者个人主页</h1>
        <p>可在这里调整作者公开信息、创作节奏和全站阅读设置。</p>
      </div>

      <div className="dashboard-grid">
        <div className="panel profile-panel" data-tour="profile">
          <div className="profile-orbit">
            <span />
            <div>{String(safeAuthor.pseudonym || "A").slice(0, 1)}</div>
          </div>
          <div className="editable-grid">
            <EditableField label="笔名" value={safeAuthor.pseudonym} onChange={(value) => patchAuthor({ pseudonym: value })} />
            <EditableField label="年龄" value={safeAuthor.age} onChange={(value) => patchAuthor({ age: value })} />
            <EditableField label="更新频率" value={safeAuthor.updateFrequency} onChange={(value) => patchAuthor({ updateFrequency: value })} multiline />
            <EditableField label="首发平台" value={safeAuthor.platform} onChange={(value) => patchAuthor({ platform: value })} />
          </div>
        </div>

        <div className="panel progress-panel">
          <div className="panel-title">
            <PenLine size={16} />
            <h2>创作进度</h2>
          </div>
          <div className="meter-ring" style={{ "--progress": `${totalProgress}%` }}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>
                {totalCurrent.toLocaleString()} / {totalTarget.toLocaleString()} 字
              </span>
            </div>
          </div>
          <div className="mini-stats">
            <span>
              <Library size={14} />
              {novels.length} 本作品
            </span>
            <span>
              <Feather size={14} />
              {safeAuthor.studioNote}
            </span>
          </div>
        </div>
      </div>

      <div className="panel appearance-panel">
        <div className="panel-title">
          <Type size={16} />
          <h2>全站阅读设置</h2>
        </div>
        <div className="appearance-controls">
          <label>
            字号
            <input
              type="range"
              min="10"
              max="20"
              value={appearance.fontSize ?? 14}
              onChange={(event) => onAppearanceChange({ fontSize: Number(event.target.value) })}
            />
            <strong>{appearance.fontSize ?? 14}px</strong>
          </label>
          <label>
            字体
            <select value={appearance.fontFamily ?? "sans"} onChange={(event) => onAppearanceChange({ fontFamily: event.target.value })}>
              <option value="sans">清爽无衬线</option>
              <option value="serif">阅读衬线</option>
              <option value="mono">设定文档等宽</option>
              <option value="yahei">系统雅黑</option>
              <option value="songti">传统宋体</option>
              <option value="mimeograph">油印仿真</option>
            </select>
          </label>
          <div className="privacy-control-row">
            <button type="button" className={appearance.darkMode ? "toggle-pill is-active" : "toggle-pill"} onClick={() => onAppearanceChange({ darkMode: !appearance.darkMode })}>
              <Moon size={14} />
              夜间模式
            </button>
            <button type="button" className={privacyBlur ? "toggle-pill is-active" : "toggle-pill"} onClick={() => onPrivacyBlurChange(!privacyBlur)}>
              <EyeOff size={14} />
              隐私模糊
            </button>
          </div>
          <div className="font-preview">
            <CaseSensitive size={17} />
            <p>这段预览会和小说页的大纲、设定集、人物背景、时间线详情保持同一字号与字体。</p>
          </div>
        </div>
      </div>

      <p className="global-disclaimer">请让创作保有边界与尊重：留意法律、版权和他人权益；AuthorHub 负责帮你梳理结构，具体内容由你安心掌握。</p>
    </section>
  );
}
