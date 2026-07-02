import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Link2, RefreshCw, Share2, Undo2, UsersRound, X } from "lucide-react";
import { SHARE_ROLES } from "../lib/shareAdapter.js";
import { DEFAULT_PUBLIC_SECTIONS, SHAREABLE_SECTIONS } from "../lib/shareSections.js";
import { usePopoverDismiss } from "../lib/usePopoverDismiss.js";

const SHARE_COPY = {
  [SHARE_ROLES.EDITOR]: {
    label: "共同编辑",
    description: "与协作者共同修订小说，保存后双方都会看到最新内容。",
  },
  [SHARE_ROLES.VIEWER]: {
    label: "只读查看",
    description: "生成可公开阅读的链接，对方只能阅读你选中的内容。",
  },
};

export default function NovelShareControl({ novel, shareInfo, onCreateShareLink, onRevokeShareLink }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(SHARE_ROLES.EDITOR);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedSections, setSelectedSections] = useState(DEFAULT_PUBLIC_SECTIONS);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  // Paused while the revoke confirmation is open so a click inside that
  // modal (portaled to document.body, outside popoverRef's DOM) doesn't read
  // as an "outside click" and close the share popover out from under it.
  usePopoverDismiss(open && !confirmRevoke, { buttonRef, popoverRef, onClose: setOpen });

  async function generateLink(nextMode = mode, { forceNew = false, matchSections = true } = {}) {
    setMode(nextMode);
    setBusy(true);
    setStatus("");
    try {
      const result = await onCreateShareLink?.(novel, nextMode, selectedSections, { forceNew, matchSections });
      setLink(result?.url ?? "");
      setStatus(result?.url ? "ready" : "");
      // Sync the picker to whatever link actually came back, not just the
      // locally-selected sections - a popover reopen/remount resets
      // selectedSections to the defaults, and without this the picker would
      // silently disagree with the link that's actually already live.
      if (result?.publicSections?.length) setSelectedSections(result.publicSections);
    } catch (error) {
      console.warn("AuthorHub share link creation failed.", error);
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  function selectMode(nextMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setLink("");
    setStatus("");
    setConfirmRevoke(false);
  }

  function toggleSection(sectionId) {
    const nextSections = selectedSections.includes(sectionId)
      ? selectedSections.length === 1
        ? selectedSections
        : selectedSections.filter((item) => item !== sectionId)
      : [...selectedSections, sectionId];
    if (nextSections === selectedSections) return;
    setSelectedSections(nextSections);
    setLink("");
    setStatus("");
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setStatus("copied");
    window.setTimeout(() => setStatus("ready"), 1400);
  }

  async function revokeLink() {
    setBusy(true);
    try {
      await onRevokeShareLink?.(novel, mode);
      setLink("");
      setStatus("");
    } catch (error) {
      console.warn("AuthorHub share link revoke failed.", error);
      setStatus("error");
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  return (
    <div className="novel-share-control">
      <button ref={buttonRef} type="button" className="novel-share-button" onClick={() => setOpen(true)} aria-label={`分享《${novel.title}》`}>
        <Share2 size={17} />
      </button>
      {open && (
        <div ref={popoverRef} className="novel-share-popover" role="dialog" aria-label={`分享《${novel.title}》`}>
          <button type="button" className="share-close" onClick={() => setOpen(false)} aria-label="关闭分享">
            <X size={14} />
          </button>
          <div className="share-heading">
            <span>
              <Share2 size={15} />
              {`分享《${novel.title}》`}
            </span>
            <small>
              <UsersRound size={13} />
              {shareInfo?.collaboratorCount ?? 1} 位协作者
            </small>
          </div>

          <div className="share-mode-tabs" role="tablist" aria-label="分享权限">
            {[SHARE_ROLES.EDITOR, SHARE_ROLES.VIEWER].map((role) => (
              <button
                key={role}
                type="button"
                className={mode === role ? "is-active" : ""}
                onClick={() => selectMode(role)}
                disabled={busy}
              >
                {SHARE_COPY[role].label}
              </button>
            ))}
          </div>

          <p>{SHARE_COPY[mode].description}</p>

          {mode === SHARE_ROLES.VIEWER && (
            <fieldset className="share-section-picker">
              <legend>选择公开内容</legend>
              <div>
                {SHAREABLE_SECTIONS.map((section) => {
                  const selected = selectedSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      onClick={() => toggleSection(section.id)}
                      aria-pressed={selected}
                      disabled={busy}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <label className="share-link-field">
            邀请链接
            <div>
              <Link2 size={14} />
              <input value={link} readOnly placeholder={busy ? "正在生成链接..." : "选择权限后生成链接"} />
            </div>
          </label>

          <div className="share-actions">
            <button type="button" onClick={() => generateLink(mode, { forceNew: Boolean(link) })} disabled={busy}>
              <RefreshCw size={14} />
              {busy ? "生成中" : link ? "重新生成" : "生成链接"}
            </button>
            <button type="button" className="share-revoke-button" onClick={() => setConfirmRevoke(true)} disabled={!link || busy}>
              <Undo2 size={14} />
              撤回
            </button>
            <button type="button" onClick={copyLink} disabled={!link || busy}>
              {status === "copied" ? <Check size={14} /> : <Copy size={14} />}
              {status === "copied" ? "已复制" : "复制"}
            </button>
          </div>

          {status === "error" && <em className="share-error">分享需要 Supabase 数据库迁移和登录状态，请先确认云端配置。</em>}
        </div>
      )}
      {confirmRevoke &&
        createPortal(
          <div className="modal-backdrop" role="presentation" onMouseDown={() => setConfirmRevoke(false)}>
            <section
              className="confirm-modal share-revoke-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="revoke-share-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p className="eyebrow">Revoke share link</p>
              <h2 id="revoke-share-title">撤回{SHARE_COPY[mode].label}链接？</h2>
              <p>
                确定删除 <strong>{link}</strong> 吗？删除后链接无效且对方{mode === SHARE_ROLES.VIEWER ? "不可见" : "不可编辑"}。
              </p>
              <div className="confirm-actions share-revoke-actions">
                <button type="button" className="ghost-button" onClick={() => setConfirmRevoke(false)}>
                  取消
                </button>
                <button type="button" className="danger-button" onClick={revokeLink} disabled={busy}>
                  确定
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
