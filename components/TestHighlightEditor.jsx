import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// Minimal sample text
const content = `This is a test to see if highlights work properly. You should see the word "test" highlighted in yellow below.`;

// Highlight plugin that finds all "test" matches
function getHighlightPlugin() {
  return new Plugin({
    props: {
      decorations(state) {
        const decos = [];
        // Loop through each node in the document
        state.doc.descendants((node, pos) => {
          if (node.isText) {
            const text = node.text;
            if (!text) return;
            let from = 0;
            // Find all matches for "test"
            while (true) {
              const idx = text.indexOf("test", from);
              if (idx === -1) break;
              // Highlight "test" from correct doc position
              decos.push(
                Decoration.inline(
                  pos + idx,
                  pos + idx + 4,
                  { class: "test-highlight" }
                )
              );
              from = idx + 4;
            }
          }
        });
        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

export default function TestHighlightEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      getHighlightPlugin(),
    ],
    content,
    editable: false,
  });

  useEffect(() => {
    // Add highlight CSS if not already present
    if (!document.getElementById("testHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "testHighlightStyle";
      style.innerHTML = `.test-highlight { background: yellow; }`;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{
      maxWidth: 600,
      margin: "2rem auto",
      background: "#fafafe",
      borderRadius: 16,
      boxShadow: "0 4px 16px 0 #e5e7eb",
      padding: 32
    }}>
      <div style={{ marginBottom: 20 }}>
        <b>Highlight Test Page</b><br />
        This is a test to see if highlights work properly.<br />
        <span style={{ fontSize: 13, color: "#777" }}>
          You should see the word <b>test</b> <span style={{ color: "#fbbf24" }}>highlighted in yellow below.</span>
        </span>
      </div>
      <div style={{ background: "#fff", border: "1px solid #dbeafe", borderRadius: 8, padding: 18 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
