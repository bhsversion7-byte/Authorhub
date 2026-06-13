import React, { useState } from "react";
import { Check, Pencil } from "lucide-react";

export default function EditableField({ label, value, onChange, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function save() {
    onChange(draft);
    setEditing(false);
  }

  return (
    <label className="editable-field">
      <span>{label}</span>
      <div className="editable-control">
        {editing ? (
          multiline ? (
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={save} />
          ) : (
            <input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={save} />
          )
        ) : (
          <strong>{value}</strong>
        )}
        <button
          type="button"
          onClick={() => {
            if (editing) save();
            else {
              setDraft(value);
              setEditing(true);
            }
          }}
          aria-label={editing ? "保存" : "编辑"}
        >
          {editing ? <Check size={15} /> : <Pencil size={15} />}
        </button>
      </div>
    </label>
  );
}
