import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextStyleControls from "./TextStyleControls.jsx";
import {
  RICH_TEXT_COLORS,
  createRichTextDocument,
  richTextToPlainText,
  sanitizeRichTextHtml,
} from "../../lib/richTextModel.js";

const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => Math.min(3, Math.max(0, Math.round((Number.parseInt(element.style.marginLeft, 10) || 0) / 24))),
          renderHTML: ({ indent }) => indent ? { style: `margin-left: ${Math.min(3, indent) * 24}px` } : {},
        },
      },
    }];
  },
});

const ColorShortcuts = Extension.create({
  name: "authorHubColorShortcuts",
  addKeyboardShortcuts() {
    return Object.fromEntries(RICH_TEXT_COLORS.map((color) => [
      `Alt-${color.shortcut.slice(-1).toLowerCase()}`,
      () => this.editor.chain().focus().setColor(color.value).run(),
    ]));
  },
});

const extensions = [
  StarterKit.configure({ blockquote: false, codeBlock: false, heading: false, horizontalRule: false }),
  TextStyle,
  Color,
  FontSize,
  TextAlign.configure({ types: ["paragraph"] }),
  ParagraphIndent,
  ColorShortcuts,
];

const RichTextSurface = forwardRef(function RichTextSurface(
  {
    documentValue,
    fallbackText = "",
    onChange,
    onBlur,
    onScroll,
    placeholder = "",
    readOnly = false,
    className = "",
    ariaLabel,
    style,
    onPointerUp,
    onEditorReady,
    contextMenuExpanded = false,
  },
  ref,
) {
  const initialDocument = useMemo(() => createRichTextDocument(documentValue, fallbackText), []);
  const [contextMenu, setContextMenu] = useState(null);
  const editor = useEditor({
    extensions,
    content: initialDocument.html,
    editable: !readOnly,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel || "富文本编辑器",
        "data-placeholder": placeholder,
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.isDestroyed) return;
      const nextDocument = { version: 1, html: sanitizeRichTextHtml(currentEditor.getHTML()) };
      const cursorIndex = currentEditor.state.doc.textBetween(0, currentEditor.state.selection.from, "\n").length;
      onChange?.(nextDocument, richTextToPlainText(nextDocument), cursorIndex);
    },
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (!documentValue || documentValue.version !== 1) return;
    const nextHtml = createRichTextDocument(documentValue, fallbackText).html;
    const currentHtml = sanitizeRichTextHtml(editor.getHTML());
    if (nextHtml !== currentHtml) editor.commands.setContent(nextHtml, { emitUpdate: false });
  }, [editor, documentValue?.version, documentValue?.html, fallbackText]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.chain().focus().run(),
    getEditor: () => editor,
    jumpToText(offset, length = 0) {
      if (!editor) return;
      let low = 1;
      let high = Math.max(1, editor.state.doc.content.size);
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        const textLength = editor.state.doc.textBetween(0, middle, "\n").length;
        if (textLength < offset) low = middle + 1;
        else high = middle;
      }
      const from = low;
      editor.chain().focus().setTextSelection({ from, to: Math.min(editor.state.doc.content.size, from + length) }).scrollIntoView().run();
    },
  }), [editor]);

  function openContextMenu(event) {
    if (readOnly || !editor || editor.state.selection.empty) return;
    event.preventDefault();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.min(event.clientX, window.innerWidth - width - 12);
    const estimatedHeight = contextMenuExpanded ? 360 : 74;
    const top = Math.min(event.clientY, window.innerHeight - estimatedHeight - 12);
    setContextMenu({ left: Math.max(12, left), top: Math.max(12, top) });
  }

  return (
    <>
      <div className={`rich-text-surface ${className}`.trim()} style={style} onContextMenu={openContextMenu} onScroll={onScroll} onPointerUp={onPointerUp}>
        <EditorContent editor={editor} />
      </div>
      {contextMenu && (
        createPortal(
          <div className="selection-style-menu" style={contextMenu} onPointerDown={(event) => event.stopPropagation()}>
            <TextStyleControls
              editor={editor}
              expanded={contextMenuExpanded}
              onClose={() => setContextMenu(null)}
              ariaLabel={contextMenuExpanded ? "选中文字完整样式" : "选中文字快捷样式"}
            />
          </div>,
          document.body,
        )
      )}
    </>
  );
});

export default RichTextSurface;
