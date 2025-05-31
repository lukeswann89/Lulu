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

const defaultText = `"Please speak to me," Sylvia begged Virginia the following day.

Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.

It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`;

const initialSuggestions = [
  {
    id: uuidv4(),
    original: '"Please speak to me,"',
    suggestion: '"Could you please speak to me?"',
    contextualInsert: 'Could you please speak to me? Sylvia begged Virginia the following day.',
    why: "Makes it more polite.",
    color: "#fde68a",
    state: "pending",
    from: 0,
    to: 25
  },
  {
    id: uuidv4(),
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    contextualInsert: "Virginia had taken two years to find her voice after that fateful day—two years to speak to another person.",
    why: "Places agency with Virginia.",
    color: "#dbeafe",
    state: "pending",
    from: 236,
    to: 267
  }
];

const SuggestionsHighlightExtension = Extension.create({
  name: 'suggestionsHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('suggestionsHighlight'),
        props: {
          decorations: (state) => {
            const decorations = [];
            const suggestions = this.editor.view.props.attributes?.suggestions || [];
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
                          style: `background-color: ${suggestion.color || '#ffe29b'}; 
                                 border-radius: 4px; 
                                 padding: 2px;
                                 ${suggestion.alignError ? 'opacity: 0.5;' : ''}`
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
  initialText = defaultText,
  readOnly = false,
  suggestions = initialSuggestions
}) => {
  const [allSuggestions, setAllSuggestions] = useState(suggestions);
  const cardRefs = useRef({});
  const undoManager = useRef(new UndoManager());

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      SuggestionsHighlightExtension
    ],
    content: initialText,
    editable: !readOnly,
    attributes: {
      suggestions: allSuggestions
    },
    immediatelyRender: false
  });

  useEffect(() => {
    if (editor) {
      editor.view.setProps({
        attributes: {
          suggestions: allSuggestions
        }
      });
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [allSuggestions, editor]);

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("luluHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "luluHighlightStyle";
      style.innerHTML = `
        .lulu-highlight { background: #fde68a; border-radius: 3px; padding: 0 2px; cursor: pointer; }
        ${allSuggestions.map(s => `
          .suggestion-highlight-${s.id} { 
            background-color: ${s.color || '#ffe29b'}; 
            border-radius: 4px; 
            padding: 2px;
            transition: background-color 0.2s;
          }
        `).join('\n')}
      `;
      document.head.appendChild(style);
    }
  }, [allSuggestions]);

  function handleAccept(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;

    const currentText = editor.getText();
    undoManager.current.save({
      text: currentText,
      suggestions: allSuggestions,
      sugId,
      actionType: 'accept'
    });

    const positions = findAllPositions(currentText, sug.original);
    if (positions.length === 0) return;

    let targetPos = positions[0];
    if (typeof sug.from === 'number') {
      let minDistance = Math.abs(positions[0].from - sug.from);
      positions.forEach(pos => {
        const distance = Math.abs(pos.from - sug.from);
        if (distance < minDistance) {
          minDistance = distance;
          targetPos = pos;
        }
      });
    }

    const newText = currentText.slice(0, targetPos.from) +
      sug.suggestion +
      currentText.slice(targetPos.to);
    editor.commands.setContent(newText);

    setAllSuggestions(prev => {
      const updated = prev.map(s =>
        s.id === sugId ? { ...s, state: "accepted" } : s
      );
      return realignSuggestions(newText, updated);
    });
  }

  function handleReject(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;

    const currentText = editor.getText();
    undoManager.current.save({
      text: currentText,
      suggestions: allSuggestions,
      sugId,
      actionType: 'reject'
    });

    setAllSuggestions(prev => {
      const updated = prev.map(s => s.id === sugId ? { ...s, state: "rejected" } : s);
      return updated;
    });
  }

  function handleRevise(sugId, val) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;
    const newVal = val || prompt("Revise suggestion:", sug.suggestion);
    if (!newVal) return;

    const currentText = editor.getText();
    undoManager.current.save({
      text: currentText,
      suggestions: allSuggestions,
      sugId,
      actionType: 'revise'
    });

    const positions = findAllPositions(currentText, sug.original);
    if (positions.length === 0) return;

    let targetPos = positions[0];
    if (typeof sug.from === 'number') {
      let minDistance = Math.abs(positions[0].from - sug.from);
      positions.forEach(pos => {
        const distance = Math.abs(pos.from - sug.from);
        if (distance < minDistance) {
          minDistance = distance;
          targetPos = pos;
        }
      });
    }

    const newText = currentText.slice(0, targetPos.from) +
      newVal +
      currentText.slice(targetPos.to);
    editor.commands.setContent(newText);

    setAllSuggestions(prev => {
      const updated = prev.map(s =>
        s.id === sugId ? {
          ...s,
          state: "revised",
          suggestion: newVal
        } : s
      );
      return realignSuggestions(newText, updated);
    });
  }

  function handleRefreshHighlights() {
    const currentText = editor.getText();
    setAllSuggestions(prev => realignSuggestions(currentText, prev));
  }

  function handleUndo() {
    // Implement global undo if needed
  }

  function handleCardUndo(sugId) {
    if (!editor) return;
    const snapshot = undoManager.current.undo(sugId);
    if (snapshot) {
      editor.commands.setContent(snapshot.text);
      setAllSuggestions(snapshot.suggestions);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        Lulu TipTap Editor (Experimental)
      </h2>
      <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fff" }}>
        <EditorContent editor={editor} />
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
            setActiveIdx={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(LuluTipTapComponent), {
  ssr: false
});
