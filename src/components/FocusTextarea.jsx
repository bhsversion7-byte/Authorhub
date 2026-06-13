import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function FocusTextarea({ label, value, onChange, rows = 5, placeholder }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [focused]);

  return (
    <label className="focus-textarea-wrap">
      <span className="focus-textarea-label">
        {label}
        <button type="button" onClick={() => setFocused(true)} aria-label={`专注编辑${label}`}>
          <Maximize2 size={14} />
        </button>
      </span>
      <textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {focused && (
        <div className="zen-overlay" role="dialog" aria-modal="true">
          <div className="zen-editor">
            <div className="zen-editor-head">
              <div>
                <p className="eyebrow">Zen focus</p>
                <h3>{label}</h3>
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
    </label>
  );
}
