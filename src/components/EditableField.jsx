import React, { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";

export default function EditableField({ label, value, onChange, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus?.();
  }, [editing]);

  function save() {
    onChange(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      save();
    }
  }

  const editor = multiline ? (
    <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} onBlur={save} />
  ) : (
    <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} onBlur={save} />
  );

  return (
    <div className={`editable-field ${editing ? "is-editing" : ""}`}>
      <span>{label}</span>
      <div className="editable-control">
        {editing ? editor : <strong>{value}</strong>}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (editing) save();
            else {
              setDraft(value ?? "");
              setEditing(true);
            }
          }}
          aria-label={editing ? "保存" : `编辑${label}`}
        >
          {editing ? <Check size={15} /> : <Pencil size={15} />}
        </button>
      </div>
    </div>
  );
}
