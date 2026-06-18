import React, { useEffect, useId, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function FocusTextarea({ label, value, onChange, rows = 5, placeholder }) {
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
      {focused && (
        <div className="zen-overlay" role="presentation" onMouseDown={() => setFocused(false)}>
          <div className="zen-editor" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
            <div className="zen-editor-head">
              <div>
                <p className="eyebrow">Focus editor</p>
                <h3 id={titleId}>{label}</h3>
              </div>
              <button type="button" onClick={() => setFocused(false)} aria-label="退出专注编辑">
                <Minimize2 size={17} />
                退出
              </button>
            </div>
            <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
