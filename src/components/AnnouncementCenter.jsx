import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronRight, Megaphone, X } from "lucide-react";
import { ANNOUNCEMENTS, LATEST_ANNOUNCEMENT } from "../data/announcements.js";
import { useEscapeToClose } from "../lib/useEscapeToClose.js";

export default function AnnouncementCenter() {
  const [openAnnouncement, setOpenAnnouncement] = useState(null);

  return (
    <article className="panel announcement-center-panel">
      <div className="panel-title spacious-title">
        <Megaphone size={16} />
        <div>
          <h2>公告中心</h2>
          <span>产品更新 / 维护提醒</span>
        </div>
      </div>
      <div className="announcement-list" aria-label="公告列表">
        {ANNOUNCEMENTS.map((announcement) => (
          <button type="button" key={announcement.id} className="announcement-item" onClick={() => setOpenAnnouncement(announcement)}>
            <time dateTime={announcement.date} className="announcement-date">
              {announcement.date}
            </time>
            <span className="announcement-copy">{announcement.summary}</span>
            <ChevronRight size={15} />
          </button>
        ))}
      </div>
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
