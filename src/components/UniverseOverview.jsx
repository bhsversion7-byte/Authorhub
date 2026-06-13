import React from "react";
import { GitFork, Milestone } from "lucide-react";

export default function UniverseOverview({ novels }) {
  return (
    <section className="section universe-section" aria-label="小说宇宙总览">
      <div className="section-heading compact">
        <p className="eyebrow">Universe map</p>
        <h2>四本小说的创作流与关系总览</h2>
      </div>
      <div className="universe-grid">
        <div className="panel global-flow">
          <div className="panel-title">
            <Milestone size={18} />
            <h3>创作时间线</h3>
          </div>
          <div className="global-timeline">
            {novels.map((novel, index) => (
              <div className="global-step" key={novel.id} style={{ "--step-color": novel.color }}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{novel.title}</strong>
                <small>{novel.finishDate}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel global-flow">
          <div className="panel-title">
            <GitFork size={18} />
            <h3>主题关系演示</h3>
          </div>
          <div className="theme-constellation">
            {novels.map((novel, index) => (
              <div className="theme-planet" key={novel.id} style={{ "--planet-color": novel.color, "--i": index }}>
                <strong>{novel.title.replace(/【|】/g, "")}</strong>
                <span>{novel.themes.slice(0, 2).join(" / ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
