import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Save } from "lucide-react";

const FocusTextarea = forwardRef(function FocusTextarea(
  { label, value, onChange, onSave, rows = 5, placeholder, readOnly = false, hideLabel = false },
  ref,
) {
  const [focused, setFocused] = useState(false);
  // The zen overlay is portaled to <body>, outside .content-shell where the
  // 阅读设置 CSS vars live, so it can't inherit them. Copy the current reading
  // font size + family onto the .zen-editor element when it opens so the
  // 放大 view matches the reading settings exactly (see reading-scale-fixes.css).
  const [zenReadingStyle, setZenReadingStyle] = useState({});
  const textareaRef = useRef(null);
  const titleId = useId();

  useImperativeHandle(ref, () => ({ open: () => setFocused(true) }), []);

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;

    const shell = document.querySelector(".content-shell");
    if (shell) {
      const cs = getComputedStyle(shell);
      const fontSize = cs.getPropertyValue("--editor-font-size").trim();
      const fontFamily = cs.getPropertyValue("--reading-font-family").trim();
      setZenReadingStyle({
        ...(fontSize ? { "--editor-font-size": fontSize, "--field-font-size": fontSize } : {}),
        ...(fontFamily ? { "--reading-font-family": fontFamily } : {}),
      });
    }

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setFocused(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [focused]);

  return (
    <div className="focus-textarea-wrap">
      {!hideLabel && (
        <div className="focus-textarea-label">
          <span>{label}</span>
          <button type="button" onClick={() => setFocused(true)} aria-label={readOnly ? `查看${label}` : `专注编辑${label}`}>
            <Maximize2 size={14} />
          </button>
        </div>
      )}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => {
          if (!readOnly) onChange?.(event.target.value);
        }}
      />
      {focused &&
        createPortal(
          <div className="zen-overlay" role="presentation" onMouseDown={() => setFocused(false)}>
            <div className="zen-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} style={zenReadingStyle} onMouseDown={(event) => event.stopPropagation()}>
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
                  {!readOnly && (
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
                  )}
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                readOnly={readOnly}
                onChange={(event) => {
                  if (!readOnly) onChange?.(event.target.value);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});

export default FocusTextarea;
