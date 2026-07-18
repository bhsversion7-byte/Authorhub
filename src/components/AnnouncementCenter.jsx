import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Megaphone,
  X,
} from "lucide-react";
import { ANNOUNCEMENTS, getAnnouncementPage, LATEST_ANNOUNCEMENT } from "../data/announcements.js";
import { useEscapeToClose } from "../lib/useEscapeToClose.js";

export default function AnnouncementCenter() {
  const [openAnnouncement, setOpenAnnouncement] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [requestedPage, setRequestedPage] = useState(0);
  const announcementPage = getAnnouncementPage(ANNOUNCEMENTS, requestedPage);
  const visibleAnnouncements = historyExpanded ? announcementPage.items : ANNOUNCEMENTS.slice(0, 1);

  const toggleHistory = () => {
    setRequestedPage(0);
    setHistoryExpanded((expanded) => !expanded);
  };

  return (
    <article className="panel announcement-center-panel">
      <div className="panel-title spacious-title">
        <Megaphone size={16} />
        <div>
          <h2>公告中心</h2>
          <span>产品更新 / 维护提醒</span>
        </div>
      </div>
      <div id="announcement-history-list" className="announcement-list" aria-label="公告列表">
        {visibleAnnouncements.map((announcement) => (
          <button
            type="button"
            key={announcement.id}
            className="announcement-item"
            onClick={() => setOpenAnnouncement(announcement)}
          >
            <time dateTime={announcement.date} className="announcement-date">
              {announcement.date}
            </time>
            <span className="announcement-copy">{announcement.summary}</span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
      {ANNOUNCEMENTS.length > 1 && (
        <button
          type="button"
          className={`edge-collapse-toggle announcement-history-toggle${historyExpanded ? "" : " is-collapsed"}`}
          onClick={toggleHistory}
          aria-controls="announcement-history-list"
          aria-expanded={historyExpanded}
          aria-label={historyExpanded ? "收起历史公告" : "展开历史公告"}
        >
          {historyExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
        </button>
      )}
      {historyExpanded && (
        <nav className="announcement-pagination" aria-label="公告分页">
          <button
            type="button"
            onClick={() => setRequestedPage(announcementPage.page - 1)}
            disabled={announcementPage.page === 0}
            aria-label="上一页公告"
          >
            <ChevronLeft size={15} />
          </button>
          <span aria-live="polite">
            {announcementPage.page + 1} / {announcementPage.totalPages} 页
          </span>
          <button
            type="button"
            onClick={() => setRequestedPage(announcementPage.page + 1)}
            disabled={announcementPage.page === announcementPage.totalPages - 1}
            aria-label="下一页公告"
          >
            <ChevronRight size={15} />
          </button>
        </nav>
      )}
      {openAnnouncement &&
        createPortal(
          <AnnouncementModal announcement={openAnnouncement} onClose={() => setOpenAnnouncement(null)} />,
          document.body,
        )}
    </article>
  );
}

export function AnnouncementTicker({ onOpen }) {
  const storageKey = LATEST_ANNOUNCEMENT ? `author-hub-announcement-dismissed:${LATEST_ANNOUNCEMENT.id}` : "";
  const [dismissed, setDismissed] = useState(() => {
    if (!storageKey) return false;
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  if (!LATEST_ANNOUNCEMENT) return null;
  if (dismissed) return null;
  return (
    <div className="announcement-ticker" role="status">
      <button type="button" className="announcement-ticker-main" onClick={onOpen} aria-label="打开公告中心">
        <Bell size={15} />
        <time dateTime={LATEST_ANNOUNCEMENT.date} className="announcement-ticker-date">
          {LATEST_ANNOUNCEMENT.date}
        </time>
        <span>{LATEST_ANNOUNCEMENT.summary}</span>
        <ChevronRight size={15} />
      </button>
      <button
        type="button"
        className="announcement-ticker-close"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(storageKey, "true");
          } catch {
            // Ignore storage failures; the close action still works in memory.
          }
        }}
        aria-label="关闭公告提示"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function AnnouncementModal({ announcement, onClose }) {
  useEscapeToClose(onClose);

  return (
    <div className="modal-backdrop announcement-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="confirm-modal announcement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="announcement-modal-close" onClick={onClose} aria-label="关闭公告">
          <X size={17} />
        </button>
        <h2 id="announcement-modal-title">{announcement.title}</h2>
        <time dateTime={announcement.date}>{announcement.date}</time>
        <div className="announcement-modal-body">
          {(announcement.body ?? []).map((paragraph, index) => (
            <p key={`${announcement.id}-p-${index}`}>{paragraph}</p>
          ))}
          {(announcement.sections ?? []).map((section, index) => (
            <section className="announcement-detail-section" key={`${announcement.id}-section-${section.title}`}>
              <h3>{index + 1}. {section.title}</h3>
              {section.why && <p><strong>为什么加入：</strong>{section.why}</p>}
              {section.description && <p>{section.description}</p>}
              {section.steps?.length > 0 && (
                <ol>
                  {section.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              )}
            </section>
          ))}
          {(announcement.images ?? []).map((image) => (
            <figure key={image.src}>
              <img src={image.src} alt={image.alt || ""} />
              {image.caption && <figcaption>{image.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
