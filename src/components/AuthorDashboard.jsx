import React from "react";
import { CaseSensitive, Feather, Library, PenLine, Type } from "lucide-react";
import EditableField from "./EditableField.jsx";

export default function AuthorDashboard({ author, novels, appearance, onAuthorChange, onAppearanceChange }) {
  const totalCurrent = novels.reduce((sum, novel) => sum + novel.currentWords, 0);
  const totalTarget = novels.reduce((sum, novel) => sum + novel.targetWords, 0);
  const totalProgress = Math.round((totalCurrent / totalTarget) * 100);

  return (
    <section id="author" className="section author-section">
      <div className="section-heading">
        <p className="eyebrow">Author dashboard</p>
        <h1>一个安静但锋利的小说宇宙工作台</h1>
        <p>这里保留作者个人信息、写作节奏和全站阅读/编辑字体设置。小说内容请从左侧选择对应书名进入。</p>
      </div>

      <div className="dashboard-grid">
        <div className="panel profile-panel">
          <div className="profile-orbit">
            <span />
            <div>{author.pseudonym.slice(0, 1)}</div>
          </div>
          <div className="editable-grid">
            <EditableField
              label="笔名"
              value={author.pseudonym}
              onChange={(value) => onAuthorChange({ ...author, pseudonym: value })}
            />
            <EditableField
              label="年龄"
              value={author.age}
              onChange={(value) => onAuthorChange({ ...author, age: value })}
            />
            <EditableField
              label="更新频率"
              value={author.updateFrequency}
              onChange={(value) => onAuthorChange({ ...author, updateFrequency: value })}
              multiline
            />
            <EditableField
              label="平台"
              value={author.platform}
              onChange={(value) => onAuthorChange({ ...author, platform: value })}
            />
          </div>
        </div>

        <div className="panel progress-panel">
          <div className="panel-title">
            <PenLine size={18} />
            <h2>创作进度</h2>
          </div>
          <div className="meter-ring" style={{ "--progress": `${totalProgress}%` }}>
            <div>
              <strong>{totalProgress}%</strong>
              <span>{totalCurrent.toLocaleString()} / {totalTarget.toLocaleString()} 字</span>
            </div>
          </div>
          <div className="mini-stats">
            <span><Library size={16} />4 本在写</span>
            <span><Feather size={16} />{author.studioNote}</span>
          </div>
        </div>
      </div>

      <div className="panel appearance-panel">
        <div className="panel-title">
          <Type size={18} />
          <h2>全站编辑字号与字体</h2>
        </div>
        <div className="appearance-controls">
          <label>
            字号
            <input
              type="range"
              min="15"
              max="24"
              value={appearance.fontSize ?? 17}
              onChange={(event) => onAppearanceChange({ fontSize: Number(event.target.value) })}
            />
            <strong>{appearance.fontSize ?? 17}px</strong>
          </label>
          <label>
            字体
            <select
              value={appearance.fontFamily ?? "sans"}
              onChange={(event) => onAppearanceChange({ fontFamily: event.target.value })}
            >
              <option value="sans">清爽无衬线</option>
              <option value="serif">阅读衬线</option>
              <option value="mono">设定文档等宽</option>
            </select>
          </label>
          <div className="font-preview">
            <CaseSensitive size={20} />
            <p>这段预览会和小说页的大纲、设定集、人物背景、时间线详情保持同一字号与字体。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
