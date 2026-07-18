import React, { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  IndentDecrease,
  IndentIncrease,
  List,
  ListOrdered,
  X,
} from "lucide-react";
import { RICH_TEXT_COLORS } from "../../lib/richTextModel.js";

export default function TextStyleControls({ editor, expanded = false, onClose, ariaLabel = "文本快捷样式" }) {
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!editor) return undefined;
    const refresh = () => setRevision((value) => value + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  if (!editor) return null;
  const fontSize = Number.parseInt(editor.getAttributes("textStyle").fontSize, 10) || 16;
  const indent = Number(editor.getAttributes("paragraph").indent) || 0;

  function command(action) {
    return (event) => {
      event.preventDefault();
      action(editor.chain().focus()).run();
    };
  }

  function changeIndent(delta) {
    const nextIndent = Math.min(3, Math.max(0, indent + delta));
    editor.chain().focus().updateAttributes("paragraph", { indent: nextIndent }).run();
  }

  return (
    <div
      className={`text-style-controls${expanded ? " is-expanded" : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target.closest("button")) event.preventDefault();
      }}
    >
      {expanded && (
        <div className="text-style-panel-head">
          <strong>样式</strong>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭文本样式">
            <X size={17} />
          </button>
        </div>
      )}
      <div className="text-style-grid">
        <StyleButton label="加粗 Ctrl+B" pressed={editor.isActive("bold")} onClick={command((chain) => chain.toggleBold())}><b>B</b></StyleButton>
        <StyleButton label="斜体 Ctrl+I" pressed={editor.isActive("italic")} onClick={command((chain) => chain.toggleItalic())}><i>I</i></StyleButton>
        <StyleButton label="下划线 Ctrl+U" pressed={editor.isActive("underline")} onClick={command((chain) => chain.toggleUnderline())}><u>U</u></StyleButton>
        <StyleButton label="删除线" pressed={editor.isActive("strike")} onClick={command((chain) => chain.toggleStrike())}><s>S</s></StyleButton>
        {RICH_TEXT_COLORS.map((color) => (
          <button
            type="button"
            key={color.id}
            className="text-color-swatch"
            style={{ "--text-swatch": color.value }}
            aria-label={`${color.label} ${color.shortcut}`}
            aria-pressed={editor.isActive("textStyle", { color: color.value }) || (color.id === "default" && !editor.getAttributes("textStyle").color)}
            onClick={command((chain) => chain.setColor(color.value))}
            title={`${color.label} ${color.shortcut}`}
          >
            A
          </button>
        ))}
        {expanded && <>
          <StyleButton label="左对齐" pressed={editor.isActive({ textAlign: "left" })} onClick={command((chain) => chain.setTextAlign("left"))}><AlignLeft size={19} /></StyleButton>
          <StyleButton label="居中对齐" pressed={editor.isActive({ textAlign: "center" })} onClick={command((chain) => chain.setTextAlign("center"))}><AlignCenter size={19} /></StyleButton>
          <StyleButton label="右对齐" pressed={editor.isActive({ textAlign: "right" })} onClick={command((chain) => chain.setTextAlign("right"))}><AlignRight size={19} /></StyleButton>
          <StyleButton label="项目符号" pressed={editor.isActive("bulletList")} onClick={command((chain) => chain.toggleBulletList())}><List size={19} /></StyleButton>
          <StyleButton label="编号列表" pressed={editor.isActive("orderedList")} onClick={command((chain) => chain.toggleOrderedList())}><ListOrdered size={19} /></StyleButton>
          <StyleButton label="减少缩进" disabled={indent === 0} onClick={() => changeIndent(-1)}><IndentDecrease size={19} /></StyleButton>
          <StyleButton label="增加缩进" disabled={indent === 3} onClick={() => changeIndent(1)}><IndentIncrease size={19} /></StyleButton>
        </>}
      </div>
      {expanded && (
        <>
          <label className="text-size-control">
            <span>Aa</span>
            <input
              type="range"
              min="12"
              max="28"
              step="1"
              value={fontSize}
              onChange={(event) => editor.chain().focus().setFontSize(`${event.target.value}px`).run()}
              aria-label="文字字号"
            />
            <strong>{fontSize}px</strong>
          </label>
        </>
      )}
    </div>
  );
}

function StyleButton({ label, pressed, disabled = false, onClick, children }) {
  return (
    <button type="button" className="text-style-button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} title={label}>
      {children}
    </button>
  );
}
