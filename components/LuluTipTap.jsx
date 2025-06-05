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

// PRESERVED: Working highlighting extension - UNTOUCHED
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
  value = "",
  setValue = () => {},
  initialText = "",
  readOnly = false,
  // NEW: Integration props from index.js
  specificEdits = [],
  onAcceptSpecific = () => {},
  onRejectSpecific = () => {},
  onReviseSpecific = () => {},
  showHighlights = true
}) => {
  // DEBUG: Log incoming data
  console.log('LuluTipTap received:', {
    specificEditsCount: specificEdits.length,
    showHighlights,
    textLength: value.length
  });

  // Transform specificEdits to highlighting format
  const transformedSuggestions = specificEdits.map((edit, idx) => ({
    id: edit.id || `edit_${idx}`,
    original: edit.original || "",
    suggestion: edit.suggestion || "",
    state: edit.state || 'pending',
    color: getColorForEditType(edit.editType),
    from: edit.from,
    to: edit.to,
    editType: edit.editType,
    idx: idx
  }));

  console.log('Transformed suggestions:', transformedSuggestions.length, transformedSuggestions);

  const undoManager = useRef(new UndoManager());
  // FIX: Use ref to store current suggestions for extension
  const suggestionsRef = useRef([]);

  // Update ref whenever suggestions change
  useEffect(() => {
    suggestionsRef.current = showHighlights ? transformedSuggestions : [];
    console.log('Updated suggestionsRef:', suggestionsRef.current.length, suggestionsRef.current);
  }, [transformedSuggestions, showHighlights]);

  // PRESERVED: TipTap Editor Setup - FIXED
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      SuggestionsHighlightExtension.configure({
        getSuggestions: () => {
          console.log('Extension getSuggestions called:', suggestionsRef.current.length, suggestionsRef.current);
          return suggestionsRef.current;
        }
      })
    ],
    content: value || initialText,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setValue(editor.getText());
    },
    immediatelyRender: false,
  });

  // PRESERVED: Editor sync logic - UNTOUCHED
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  // NEW: Force extension update when suggestions change
  useEffect(() => {
    if (editor) {
      // Force re-render of decorations by updating editor state
      editor.view.updateState(editor.view.state);
      console.log('Forced editor decoration update');
    }
  }, [transformedSuggestions, showHighlights, editor]);

  // NEW: Dynamic highlight CSS for edit types
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("luluHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "luluHighlightStyle";
      style.innerHTML = transformedSuggestions.map(s => `
        .suggestion-highlight-${s.id} { 
          background-color: ${s.color}; 
          border-radius: 4px; 
          padding: 2px;
          transition: background-color 0.2s;
          cursor: pointer;
        }
        .suggestion-highlight-${s.id}:hover { 
          opacity: 0.8;
        }
      `).join('\n');
      document.head.appendChild(style);
    }
  }, [transformedSuggestions]);

  // NEW: Click handler for highlighted suggestions
  useEffect(() => {
    const handleClick = (e) => {
      const suggestionEl = e.target.closest('[class*="suggestion-highlight-"]');
      if (suggestionEl) {
        const className = suggestionEl.className;
        const match = className.match(/suggestion-highlight-(\w+)/);
        if (match) {
          const suggestionId = match[1];
          const suggestion = transformedSuggestions.find(s => s.id === suggestionId);
          if (suggestion) {
            // Scroll to corresponding suggestion in panel
            console.log('Clicked suggestion:', suggestion);
          }
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [transformedSuggestions]);

  // REMOVED: All standalone suggestion management (handled by index.js now)

  // SIMPLIFIED: Just the editor component
  return (
    <div className="border rounded min-h-[14rem] p-3 text-base whitespace-pre-wrap font-serif"
         style={{outline:'2px solid #a78bfa', position:'relative', minHeight:'300px'}}>
      {editor && <EditorContent editor={editor} />}
    </div>
  );
};

// Helper function to assign colors based on edit type
function getColorForEditType(editType) {
  const colors = {
    'Line': '#ffe29b',      // Yellow
    'Copy': '#fecaca',      // Light red
    'Developmental': '#fed7aa', // Light orange
    'Structural': '#d1fae5',    // Light green
    'Proof': '#e0e7ff',     // Light blue
    'Other': '#f3e8ff'      // Light purple
  };
  return colors[editType] || colors['Other'];
}

export default dynamic(() => Promise.resolve(LuluTipTapComponent), {
  ssr: false
});