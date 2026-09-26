"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export type JobEditorDocument = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JobEditorDocument[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export const EMPTY_JOB_DOCUMENT: JobEditorDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type JobRichTextEditorProps = {
  initialContent?: JobEditorDocument;
  onChange?: (document: JobEditorDocument) => void;
};

const toolbarButton =
  "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-xs font-semibold transition hover:bg-[#f4f6f8] disabled:cursor-not-allowed disabled:opacity-40";

const activeToolbarButton =
  "border-sidebar bg-sidebar text-white hover:bg-sidebar";

export function JobRichTextEditor({
  initialContent = EMPTY_JOB_DOCUMENT,
  onChange,
}: JobRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "min-h-72 px-4 py-4 text-sm leading-7 text-sidebar outline-none " +
          "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold " +
          "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold " +
          "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 " +
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 " +
          "[&_li]:my-1",
      },
    },
    onCreate({ editor: currentEditor }) {
      onChange?.(currentEditor.getJSON());
    },
    onUpdate({ editor: currentEditor }) {
      onChange?.(currentEditor.getJSON());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-72 animate-pulse rounded-xl border border-border bg-[#f8f9fb]" />
    );
  }

  const buttonClass = (active: boolean) =>
    `${toolbarButton} ${active ? activeToolbarButton : ""}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap gap-1.5 border-b border-border bg-[#f8f9fb] p-2">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive("heading", { level: 2 }))} aria-label="Heading" title="Heading">H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))} aria-label="Bold" title="Bold">B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))} aria-label="Italic" title="Italic">I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))} aria-label="Bullet list" title="Bullet list">• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive("orderedList"))} aria-label="Numbered list" title="Numbered list">1. List</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
