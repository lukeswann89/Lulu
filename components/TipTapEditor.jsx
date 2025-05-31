"use client";
import React, { useEffect } from "react";
import { EditorContent, useEditor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";

export default function TipTapEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Highlight],
    content: value,
    editable: true,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    }
  });

  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  return (
    <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 14, background: "#fff" }}>
      <EditorContent editor={editor} />
    </div>
  );
}
