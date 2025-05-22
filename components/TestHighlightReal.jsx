import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const highlightPlugin = new Plugin({
  key: new PluginKey("test-highlight"),
  props: {
    decorations(state) {
      let foundText = false;
      let firstTextNodePos = null;
      let firstTextNodeSize = null;
      state.doc.descendants((node, pos) => {
        console.log("Node type:", node.type && node.type.name, "at pos", pos, "nodeSize", node.nodeSize, "text:", node.text || '');
        if (node.isText && !foundText) {
          foundText = true;
          firstTextNodePos = pos;
          firstTextNodeSize = node.nodeSize;
          console.log("First TEXT node found at pos", pos, "text:", node.text, "size:", node.nodeSize);
        }
      });
      if (!foundText) {
        console.log("No text nodes found in document!");
        return null;
      }
      const from = firstTextNodePos;
      const to = firstTextNodePos + Math.min(5, firstTextNodeSize - 1);
      console.log("Creating decoration from", from, "to", to);
      if (from >= to) {
        console.error("Highlight range invalid:", from, to);
        return DecorationSet.empty;
      }
      try {
        const deco = Decoration.inline(from, to, {
          class: "test-highlight",
          "data-test": "yes"
        });
        return DecorationSet.create(state.doc, [deco]);
      } catch (e) {
        console.error("Decoration creation error:", e);
        return DecorationSet.empty;
      }
    }
  }
});

const HighlightExtension = Extension.create({
  name: 'highlightPluginOnly',
  addProseMirrorPlugins() {
    return [highlightPlugin];
  }
});

export default function TestHighlightReal() {
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, HighlightExtension],
    content: "This is a test to see if highlights work properly.",
    onCreate: ({ editor }) => {
      console.log(
        "ProseMirror doc structure:",
        JSON.stringify(editor.state.doc.toJSON(), null, 2)
      );
      setTimeout(() => {
        const spans = document.querySelectorAll(".test-highlight");
        console.log("DOM highlight spans found:", spans.length);
        spans.forEach((span) =>
          console.log("Highlight span text:", span.textContent)
        );
        console.log("All extensions loaded:", editor.extensionManager.extensions.map(e => e.name));
      }, 1000);
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("testHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "testHighlightStyle";
      style.innerHTML = `.test-highlight { background: #ff0; padding: 0 2px; border-radius: 2px; }`;
      document.head.appendChild(style);
    }
  }, []);

  if (!editor) return null;

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Highlight Test Page (Plugin Only, Minimal Schema)</h2>
      <EditorContent editor={editor} key={!!editor} />
      <div style={{ marginTop: 24, fontSize: 14, color: "#888" }}>
        <p>
          Check browser console for logs:
          <br />- Node types, positions, and text
          <br />- Any error messages
          <br />- Loaded extensions list
          <br />- How many <code>.test-highlight</code> spans found
        </p>
      </div>
    </div>
  );
}
