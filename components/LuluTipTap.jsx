"use client";
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from "react";
import { EditorContent, useEditor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";
import UndoManager from "../utils/undoManager";
import { findAllPositions, realignSuggestions } from "../utils/suggestionUtils";
import SuggestionCard from "./SuggestionCard";

// This must be the only place you add StarterKit extensions.
const SuggestionsHighlightExtension = Extension.create({
  name: 'suggestionsHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('suggestionsHighlight'),
        props: {
          decorations: (state) => {
            const suggestions = this.options.getSuggestions ? this.options.getSuggestions() : [];
            const decorations = [];
            suggestions.forEach((suggestion) => {
              if (suggestion.state === 'pending') {
                const text = state.doc.textContent;
                const positions = findAllPositions(text, suggestion.original);
                if (positions.length === 0) return;
                let bestPosition = positions[0];
                if (typeof suggestion.from === 'number') {
                  let minDistance = Math.abs(positions[0].from - suggestion.from);
                  positions.forEach(pos => {
                    const distance = Math.abs(pos.from - suggestion.from);
                    if (distance < minDistance) {
                      minDistance = distance;
                      bestPosition = pos;
                    }
                  });
                }
                let pos = 0;
                state.doc.descendants((node, nodePos) => {
                  if (node.isText) {
                    const index = node.text.indexOf(suggestion.original, pos === nodePos ? bestPosition.from : 0);
                    if (index !== -1) {
                      const start = nodePos + index;
                      const end = start + suggestion.original.length;
                      decorations.push(
                        Decoration.inline(start, end, {
                          class: `suggestion-highlight-${suggestion.id}`,
                          style: `background-color: ${suggestion.color || '#ffe29b'}; border-radius: 4px; padding: 2px;${suggestion.alignError ? 'opacity: 0.5;' : ''}`
                        })
                      );
                      return false;
                    }
                  }
                  pos = nodePos;
                });
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

const LuluTipTapComponent = ({
  initialText = "",
  readOnly = false,
  suggestions = []
}) => {
  const [allSuggestions, setAllSuggestions] = useState(suggestions);
  const undoManager = useRef(new UndoManager());

  // ABSOLUTELY NEVER add individual Bold/Paragraph/etc below!
  const editor = useEditor({
    extensions: [
      StarterKit,         // Only this, never add paragraph/bold etc directly.
      Highlight,
      SuggestionsHighlightExtension.configure({
        getSuggestions: () => allSuggestions
      })
    ],
    content: initialText,
    editable: !readOnly,
    immediatelyRender: false, // SSR warning fix
  });

  // Dynamic highlight CSS
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("luluHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "luluHighlightStyle";
      style.innerHTML = allSuggestions.map(s => `
        .suggestion-highlight-${s.id} { 
          background-color: ${s.color || '#ffe29b'}; 
          border-radius: 4px; 
          padding: 2px;
          transition: background-color 0.2s;
        }
      `).join('\n');
      document.head.appendChild(style);
    }
  }, [allSuggestions]);

  // All handler logic unchanged (shortened for brevity)
  function handleAccept(sugId) { /* ...same as above... */ }
  function handleReject(sugId) { /* ...same as above... */ }
  function handleRevise(sugId, val) { /* ...same as above... */ }
  function handleRefreshHighlights() { /* ...same as above... */ }
  function handleUndo() { /* ...same as above... */ }
  function handleCardUndo(sugId) { /* ...same as above... */ }

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        Lulu TipTap Editor (Experimental)
      </h2>
      <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fff" }}>
        {editor && <EditorContent editor={editor} />}
      </div>
      <div style={{ marginBottom: 20, display: 'flex', gap: '10px' }}>
        <button
          onClick={handleUndo}
          style={{
            background: "#a78bfa",
            color: "white",
            padding: "6px 16px",
            borderRadius: 6,
            fontWeight: 600,
            border: 'none'
          }}
        >
          Undo
        </button>
        <button
          onClick={handleRefreshHighlights}
          style={{
            background: "#60a5fa",
            color: "white",
            padding: "6px 16px",
            borderRadius: 6,
            fontWeight: 600,
            border: 'none'
          }}
        >
          Refresh Highlights
        </button>
      </div>
      <h3 style={{ marginTop: 0, color: "#2563eb" }}>Specific Edit Suggestions</h3>
      <div>
        {allSuggestions.map((sug, idx) => (
          <SuggestionCard
            key={sug.id}
            sug={sug}
            idx={idx}
            onAccept={(id) => handleAccept(id)}
            onReject={(id) => handleReject(id)}
            onRevise={(id, val) => handleRevise(id, val)}
            onUndo={(id) => handleCardUndo(id)}
            activeIdx={null}
            setActiveIdx={() => { }}
          />
        ))}
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(LuluTipTapComponent), {
  ssr: false
});
