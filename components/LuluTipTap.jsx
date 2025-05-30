"use client";
import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from "react";
import { EditorContent, useEditor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";

const defaultText = `"Please speak to me," Sylvia begged Virginia the following day.

Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.

It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`;

const initialSuggestions = [
  {
    id: uuidv4(),
    original: '"Please speak to me,"',
    suggestion: 'Could you please speak to me?',
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

function findAllPositions(text, searchStr) {
  const positions = [];
  let lastIndex = 0;
  while (true) {
    const index = text.indexOf(searchStr, lastIndex);
    if (index === -1) break;
    positions.push({
      from: index,
      to: index + searchStr.length
    });
    lastIndex = index + 1; // Allow overlapping matches
  }
  return positions;
}

function realignSuggestions(text, suggestions) {
  console.log("Realigning suggestions for text:", text);
  console.log("Current suggestions before realign:", suggestions);

  // Create a map of all positions for each original text
  const positionMap = new Map();
  suggestions.forEach(sug => {
    if (sug.state === 'pending') {
      positionMap.set(sug.id, findAllPositions(text, sug.original));
    }
  });

  console.log("Found positions for pending suggestions:", Object.fromEntries(positionMap));

  // For each pending suggestion, find best position match
  return suggestions.map(sug => {
    if (sug.state !== 'pending') return sug;

    const positions = positionMap.get(sug.id) || [];
    if (positions.length === 0) {
      console.log(`No positions found for suggestion ${sug.id} ("${sug.original}")`);
      return {
        ...sug,
        alignError: true,
        errorMessage: `Original text "${sug.original}" not found in current document`
      };
    }

    // Find position closest to previous from/to
    let bestPosition = positions[0];
    let minDistance = Infinity;
    
    if (typeof sug.from === 'number') {
      positions.forEach(pos => {
        const distance = Math.abs(pos.from - sug.from);
        if (distance < minDistance) {
          minDistance = distance;
          bestPosition = pos;
        }
      });
    }

    console.log(`Selected position for "${sug.original}":`, bestPosition);
    return {
      ...sug,
      from: bestPosition.from,
      to: bestPosition.to,
      alignError: false,
      errorMessage: null
    };
  });
}

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
                
                // Find all possible positions
                const positions = findAllPositions(text, suggestion.original);
                if (positions.length === 0) return;

                // Find best position match
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

                // Create decoration at best position
                let pos = 0;
                state.doc.descendants((node, nodePos) => {
                  if (node.isText) {
                    const index = node.text.indexOf(suggestion.original, 
                      pos === nodePos ? bestPosition.from : 0);
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

// Wrap the component for SSR
const LuluTipTapComponent = ({
  initialText = defaultText,
  readOnly = false,
  suggestions = initialSuggestions
}) => {
  const [allSuggestions, setAllSuggestions] = useState(suggestions);
  const [history, setHistory] = useState([]);
  const cardRefs = useRef({});

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
    // Fix SSR hydration
    immediatelyRender: false
  });

  // Update editor attributes when suggestions change
  useEffect(() => {
    if (editor) {
      console.log("Updating editor with new suggestions:", allSuggestions);
      editor.view.setProps({
        attributes: {
          suggestions: allSuggestions
        }
      });
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [allSuggestions, editor]);

  // === Inject highlight CSS on mount ===
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
    console.log("Accepting suggestion:", sugId);
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;

    const currentText = editor.getText();
    console.log("Current text before accept:", currentText);
    
    setHistory(h => [...h, { 
      text: currentText, 
      suggestions: [...allSuggestions] 
    }]);

    // Find all positions of the original text
    const positions = findAllPositions(currentText, sug.original);
    if (positions.length === 0) {
      console.error("Could not find original text to replace:", sug.original);
      return;
    }

    // Find best position match
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
    
    console.log("New text after replacement:", newText);
    editor.commands.setContent(newText);

    setAllSuggestions(prev => {
      // First update only this suggestion's state
      const updated = prev.map(s => 
        s.id === sugId ? { ...s, state: "accepted" } : s
      );
      
      // Then realign all remaining pending suggestions
      return realignSuggestions(newText, updated);
    });
  }

  function handleReject(sugId) {
    console.log("Rejecting suggestion:", sugId);
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;

    const currentText = editor.getText();
    setHistory(h => [...h, { 
      text: currentText, 
      suggestions: [...allSuggestions] 
    }]);

    setAllSuggestions(prev => {
      const updated = prev.map(s => s.id === sugId ? { ...s, state: "rejected" } : s);
      console.log("Suggestions after reject:", updated);
      return updated;
    });
  }

  function handleRevise(sugId) {
    console.log("Revising suggestion:", sugId);
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;

    const newVal = prompt("Revise suggestion:", sug.suggestion);
    if (!newVal) return;

    const currentText = editor.getText();
    console.log("Current text before revise:", currentText);
    
    setHistory(h => [...h, { 
      text: currentText, 
      suggestions: [...allSuggestions] 
    }]);

    // Find all positions of the original text
    const positions = findAllPositions(currentText, sug.original);
    if (positions.length === 0) {
      console.error("Could not find original text to revise:", sug.original);
      return;
    }

    // Find best position match
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
    
    console.log("New text after revision:", newText);
    editor.commands.setContent(newText);

    setAllSuggestions(prev => {
      // First update only this suggestion
      const updated = prev.map(s => 
        s.id === sugId ? { 
          ...s, 
          state: "revised", 
          suggestion: newVal 
        } : s
      );
      
      // Then realign all remaining pending suggestions
      return realignSuggestions(newText, updated);
    });
  }

  function handleRefreshHighlights() {
    console.log("Manually refreshing highlights");
    const currentText = editor.getText();
    setAllSuggestions(prev => realignSuggestions(currentText, prev));
  }

  function handleUndo() {
    if (!history.length || !editor) return;
    
    const last = history[history.length - 1];
    editor.commands.setContent(last.text);
    setAllSuggestions(last.suggestions);
    setHistory(h => h.slice(0, -1));
  }

  function handleCardUndo(sugId) {
    if (!editor) return;

    // Save current state to history
    const currentText = editor.getText();
    setHistory(h => [...h, { 
      text: currentText, 
      suggestions: [...allSuggestions] 
    }]);
    
    setAllSuggestions(prev => 
      prev.map(s => s.id === sugId ? { ...s, state: "pending" } : s)
    );
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
      {allSuggestions.map((s, idx) => {
        const buttonStyles = {
          base: {
            padding: "2px 14px",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            marginRight: 10
          },
          accept: {
            background: s.alignError ? "#d1d5db" : "#22c55e",
            color: "white",
            cursor: s.alignError ? "not-allowed" : "pointer"
          },
          reject: {
            background: "#ef4444",
            color: "white"
          },
          revise: {
            background: s.alignError ? "#d1d5db" : "#facc15",
            color: "#1e293b",
            cursor: s.alignError ? "not-allowed" : "pointer"
          },
          undo: {
            background: "#a78bfa",
            color: "white",
            marginTop: 8
          }
        };

        return (
          <div
            key={s.id}
            ref={el => cardRefs.current[s.id] = el}
            style={{
              background: s.color || "#fef3c7",
              border: "2px solid #fcd34d",
              borderRadius: 8,
              padding: 14,
              marginBottom: 12,
              position: "relative",
              opacity: s.alignError ? 0.7 : 1
            }}
          >
            <div style={{
              position: "absolute",
              top: 12,
              right: 16,
              fontSize: 16,
              color: "#a16207",
              background: "#fde68a",
              borderRadius: 7,
              padding: "0 7px",
              fontWeight: 700
            }}>#{idx + 1}</div>
            {s.state === "pending" ? (
              <>
                <div><b>Original:</b> <span style={{ color: "#991b1b" }}>{s.original}</span></div>
                <div><b>Suggestion:</b> <span style={{ color: "#2563eb" }}>{s.suggestion}</span></div>
                <div><b>Why:</b> <span style={{ color: "#059669" }}>{s.why}</span></div>
                {s.alignError && (
                  <div style={{ color: "#dc2626", marginTop: 4, fontSize: 14 }}>
                    {s.errorMessage || "Cannot find original text in current document"}
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleAccept(s.id)} 
                    disabled={s.alignError}
                    style={{ ...buttonStyles.base, ...buttonStyles.accept }}
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleReject(s.id)} 
                    style={{ ...buttonStyles.base, ...buttonStyles.reject }}
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleRevise(s.id)} 
                    disabled={s.alignError}
                    style={{ ...buttonStyles.base, ...buttonStyles.revise }}
                  >
                    Revise
                  </button>
                </div>
              </>
            ) : (
              <>
                <div><b>[{s.state.toUpperCase()}]</b> Original: <span style={{ color: "#991b1b" }}>{s.original}</span></div>
                <div>Suggestion: <span style={{ color: "#2563eb" }}>{s.suggestion}</span></div>
                <button 
                  onClick={() => handleCardUndo(s.id)} 
                  style={{ ...buttonStyles.base, ...buttonStyles.undo }}
                >
                  Undo
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Export a dynamic component with SSR disabled
export default dynamic(() => Promise.resolve(LuluTipTapComponent), {
  ssr: false
});
