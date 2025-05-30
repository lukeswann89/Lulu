"use client";
import dynamic from 'next/dynamic';
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// Minimal TipTap Editor (no SSR)
function LuluTipTap() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<p>Hello world! Start typing to test TipTap in Next.js.</p>`,
    autofocus: true,
    editable: true,
  });

  if (!editor) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: 24 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>
        Lulu TipTap Minimal Demo
      </h2>
      <EditorContent editor={editor} />
    </div>
  );
}

// Dynamic import to avoid SSR problems!
export default dynamic(() => Promise.resolve(LuluTipTap), { ssr: false });
