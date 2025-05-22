import React, { useEffect, useRef } from "react";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { Decoration, DecorationSet } from "prosemirror-view";

export default function ProseMirrorVanilla() {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const mySchema = new Schema({
      nodes: basicSchema.spec.nodes,
      marks: basicSchema.spec.marks,
    });

    const doc = mySchema.node("doc", null, [
      mySchema.node("paragraph", null, [
        mySchema.text("This is a test to see if highlights work properly.")
      ])
    ]);

    const plugin = new Plugin({
      props: {
        decorations(state) {
          let found = false;
          let firstTextNodePos = null;
          let firstTextNodeSize = null;
          state.doc.descendants((node, pos) => {
            console.log("Node type:", node.type.name, "at pos", pos, "nodeSize", node.nodeSize, "text:", node.text || '');
            if (node.isText && !found) {
              found = true;
              firstTextNodePos = pos;
              firstTextNodeSize = node.nodeSize;
              console.log("First TEXT node at", pos, "size", node.nodeSize);
            }
          });
          if (!found) {
            console.log("No text nodes found.");
            return null;
          }
          const from = firstTextNodePos;
          const to = firstTextNodePos + Math.min(5, firstTextNodeSize - 1);
          console.log("Creating decoration from", from, "to", to);
          if (from >= to) return DecorationSet.empty;
          const deco = Decoration.inline(from, to, { class: "test-highlight" });
          return DecorationSet.create(state.doc, [deco]);
        }
      }
    });

    const state = EditorState.create({
      doc,
      plugins: [plugin]
    });

    const view = new EditorView(editorRef.current, {
      state
    });

    // Style for highlight
    if (!document.getElementById("testHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "testHighlightStyle";
      style.innerHTML = `.test-highlight { background: #ff0; padding: 0 2px; border-radius: 2px; }`;
      document.head.appendChild(style);
    }

    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "2rem auto", padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>ProseMirror Vanilla Highlight Test</h2>
      <div ref={editorRef} />
      <div style={{ marginTop: 24, fontSize: 14, color: "#888" }}>
        <p>
          Check browser console for logs:
          <br />- Node types, positions, and text
          <br />- Any error messages
          <br />- Look for yellow highlights on “This i...”
        </p>
      </div>
    </div>
  );
}
