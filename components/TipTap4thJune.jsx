"use client";
import React, { useState, useEffect } from "react";
import { EditorContent, useEditor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// Utility function to find text positions
function findAllPositions(text, searchText) {
  const positions = [];
  let index = text.indexOf(searchText);
  while (index !== -1) {
    positions.push({ from: index, to: index + searchText.length });
    index = text.indexOf(searchText, index + 1);
  }
  return positions;
}

// Working highlighting extension from LuluTipTap
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
                          style: `background-color: ${suggestion.color || '#ffe29b'}; border-radius: 4px; padding: 2px;`
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

export default function BasicTipTapTest() {
  const [text, setText] = useState(`Chapter 3: The Cornerstone

"Please speak to me," Sylvia begged Virginia on the fifth day of silence.

Virginia sat at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.

The iron knot in her heart tightened. It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person.`);

  const [suggestions, setSuggestions] = useState([
    {
      id: '1',
      original: 'Virginia sat at the makeshift desk, staring emptily at the grey sky outside.',
      suggestion: 'Virginia sat at the makeshift desk, her gaze fixed on the grey sky outside, as if searching for answers in its endless expanse.',
      state: 'pending',
      color: '#ffe29b'
    },
    {
      id: '2', 
      original: 'Sylvia\'s chest was braced for something awful',
      suggestion: 'Sylvia felt a looming dread, as if anticipating a crash',
      state: 'pending',
      color: '#fecaca'
    },
    {
      id: '3',
      original: 'The iron knot in her heart tightened',
      suggestion: 'Sylvia felt an iron knot tighten in her heart',
      state: 'pending', 
      color: '#fed7aa'
    }
  ]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      SuggestionsHighlightExtension.configure({
        getSuggestions: () => suggestions
      })
    ],
    content: text,
    onUpdate: ({ editor }) => {
      setText(editor.getText());
    },
    immediatelyRender: false,
  });

  // Force editor to re-render when suggestions change
  useEffect(() => {
    if (editor) {
      editor.view.updateState(editor.view.state);
    }
  }, [suggestions, editor]);

  const handleAccept = (sugId) => {
    setSuggestions(prev => prev.map(s => 
      s.id === sugId ? { ...s, state: 'accepted' } : s
    ));
  };

  const handleReject = (sugId) => {
    setSuggestions(prev => prev.map(s => 
      s.id === sugId ? { ...s, state: 'rejected' } : s
    ));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '24px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#9333ea', marginBottom: '24px' }}>
        Basic TipTap Highlighting Test
      </h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Editor */}
        <div>
          <div style={{ 
            border: '2px solid #a78bfa', 
            borderRadius: '8px', 
            padding: '16px', 
            background: '#fff',
            minHeight: '400px'
          }}>
            {editor && <EditorContent editor={editor} />}
          </div>
        </div>
        
        {/* Suggestions Panel */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb', marginBottom: '16px' }}>
            Suggestions ({suggestions.filter(s => s.state === 'pending').length} pending)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.map((sug, idx) => (
              <div
                key={sug.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: sug.state === 'pending' ? '#fcd34d' : sug.state === 'accepted' ? '#22c55e' : '#ef4444',
                  background: sug.state === 'pending' ? '#fef3c7' : sug.state === 'accepted' ? '#dcfce7' : '#fee2e2',
                  opacity: sug.state === 'pending' ? 1 : 0.6
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600' }}>Original:</div>
                  <div style={{ color: '#991b1b' }}>{sug.original}</div>
                </div>
                
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600' }}>Suggestion:</div>
                  <div style={{ color: '#1e40af' }}>{sug.suggestion}</div>
                </div>
                
                {sug.state === 'pending' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAccept(sug.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#22c55e',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(sug.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {sug.state === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
        <strong>Expected behavior:</strong> You should see yellow, pink, and orange highlights on the original text phrases in the editor.
      </div>
    </div>
  );
}