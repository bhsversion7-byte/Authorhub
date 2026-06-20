import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Save } from "lucide-react";

export default function FocusTextarea({ label, value, onChange, onSave, rows = 5, placeholder }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setFocused(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [focused]);

  return (
    <div className="focus-textarea-wrap">
      <div className="focus-textarea-label">
        <span>{label}</span>
        <button type="button" onClick={() => setFocused(true)} aria-label={`专注编辑${label}`}>
          <Maximize2 size={14} />
        </button>
      </div>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {focused &&
        createPortal(
        <div className="zen-overlay" role="presentation" onMouseDown={() => setFocused(false)}>
          <div className="zen-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
            <div className="zen-editor-head">
              <div>
                <p className="eyebrow">Focus editor</p>
                <h3 id={titleId}>{label}</h3>
              </div>
              <div className="zen-editor-actions">
                <button type="button" className="zen-exit-button" onClick={() => setFocused(false)} aria-label="退出专注编辑">
                  <Minimize2 size={17} />
                  退出
                </button>
                <button
                  type="button"
                  className="zen-save-button"
                  onClick={() => {
                    onSave?.();
                    setFocused(false);
                  }}
                  aria-label={`保存${label}`}
                >
                  <Save size={17} />
                  保存
                </button>
              </div>
            </div>
            <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} />
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}
