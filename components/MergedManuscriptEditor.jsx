"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import dynamic from 'next/dynamic';
import { EditorContent, useEditor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";

// Utility functions (inline for now - can be extracted later)
function findAllPositions(text, searchText) {
  const positions = [];
  let index = text.indexOf(searchText);
  while (index !== -1) {
    positions.push({ from: index, to: index + searchText.length });
    index = text.indexOf(searchText, index + 1);
  }
  return positions;
}

function realignSuggestions(text, suggestions) {
  return suggestions.map(sug => {
    if (sug.state !== 'pending') return sug;
    const positions = findAllPositions(text, sug.original);
    if (positions.length === 0) {
      return { ...sug, alignError: true };
    }
    return { ...sug, from: positions[0].from, to: positions[0].to, alignError: false };
  });
}

// Simple UndoManager (inline for now)
class UndoManager {
  constructor() {
    this.history = [];
    this.maxHistory = 50;
  }
  
  save(snapshot) {
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  undo(sugId) {
    const index = this.history.findIndex(h => h.sugId === sugId);
    if (index !== -1) {
      const snapshot = this.history[index];
      this.history.splice(index, 1);
      return snapshot;
    }
    return null;
  }
}

// Custom TipTap Extension for Suggestion Highlighting
const SuggestionsHighlightExtension = Extension.create({
  name: 'suggestionsHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('suggestionsHighlight'),
        props: {
          decorations: (state) => {
            const suggestions = this.options.suggestions || [];
            console.log('Extension running with suggestions:', suggestions.length);
            const decorations = [];
            
            suggestions.forEach((suggestion) => {
              if (suggestion.state === 'pending') {
                // Try stored positions first
                if (suggestion.from != null && suggestion.to != null) {
                  try {
                    decorations.push(
                      Decoration.inline(suggestion.from, suggestion.to, {
                        class: `suggestion-highlight suggestion-${suggestion.id}`,
                        style: `background-color: ${suggestion.color || '#ffe29b'}; border-radius: 4px; padding: 2px 4px; cursor: pointer;`,
                        'data-suggestion-id': suggestion.id
                      })
                    );
                    return; // Skip text search if positions worked
                  } catch (e) {
                    // Fall through to text search
                  }
                }
                
                // Fallback: search for text in document
                state.doc.descendants((node, nodePos) => {
                  if (node.isText) {
                    // Add this inside the descendants function, right before the indexOf:
console.log('Looking for:', suggestion.original);
console.log('In node text:', node.text);
                    
const index = node.text.indexOf(suggestion.original);
console.log('Found at index:', node.text.indexOf(suggestion.original));

                    if (index !== -1) {
                      const start = nodePos + index;
                      const end = start + suggestion.original.length;
                      decorations.push(
                        Decoration.inline(start, end, {
                          class: `suggestion-highlight suggestion-${suggestion.id}`,
                          style: `background-color: ${suggestion.color || '#ffe29b'}; border-radius: 4px; padding: 2px 4px; cursor: pointer;`,
                          'data-suggestion-id': suggestion.id
                        })
                      );
                      return false; // Stop searching
                    }
                  }
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

const MergedManuscriptEditor = ({
  initialText = "Paste or type your manuscript here. Start editing...",
  value,
  setValue,
  initialSuggestions = [],
  readOnly = false,
  onGetSuggestions,
  editLevel = "Developmental"
}) => {
  // Core state
  const [manuscriptText, setManuscriptText] = useState(value || initialText);
  const [allSuggestions, setAllSuggestions] = useState(initialSuggestions);
  const [originalText] = useState(value || initialText);
  const [activeSuggestionId, setActiveSuggestionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  
  // Refs
  const undoManager = useRef(new UndoManager());
  const lastSaveRef = useRef(Date.now());
  
  // Stats calculations
  const wordCount = useMemo(() => 
    manuscriptText.split(/\s+/).filter(Boolean).length, [manuscriptText]
  );
  const readingTime = useMemo(() => 
    Math.max(1, Math.ceil(wordCount / 250)), [wordCount]
  );
  const authenticity = useMemo(() => {
    if (originalText === manuscriptText) return 100;
    let total = originalText.length;
    let changed = 0;
    allSuggestions.forEach(sug => {
      if (sug.state === "accepted") changed += sug.suggestion.length;
      if (sug.state === "revised") changed += Math.floor(sug.suggestion.length / 2);
    });
    return Math.max(0, Math.round(100 - (changed / total) * 100));
  }, [originalText, manuscriptText, allSuggestions]);

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      SuggestionsHighlightExtension.configure({
  getSuggestions: () => {
    // This will get the current suggestions each time
    return allSuggestions;
  }
})
    ],
    content: manuscriptText,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const newText = editor.getText();
      setManuscriptText(newText);
      if (setValue) setValue(newText);
      
      // Realign suggestions after manual edits
      if (newText !== manuscriptText) {
        setAllSuggestions(prev => realignSuggestions(newText, prev));
      }
    },
    immediatelyRender: false,
  });

  // Keep editor in sync with value prop
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getText()) {
      editor.commands.setContent(value, false);
      setManuscriptText(value);
    }
  }, [value, editor]);

  // Auto-save to localStorage
  useEffect(() => {
    const saveInterval = setInterval(() => {
      try {
        setAutoSaveStatus('saving');
        localStorage.setItem('lulu-manuscript-backup', JSON.stringify({
          text: manuscriptText,
          suggestions: allSuggestions,
          timestamp: Date.now()
        }));
        setAutoSaveStatus('saved');
        lastSaveRef.current = Date.now();
      } catch (e) {
        setAutoSaveStatus('error');
        console.error('Auto-save failed:', e);
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(saveInterval);
  }, [manuscriptText, allSuggestions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!editor?.view?.hasFocus()) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (activeSuggestionId) handleAccept(activeSuggestionId);
            break;
          case 'Backspace':
            e.preventDefault();
            if (activeSuggestionId) handleReject(activeSuggestionId);
            break;
          case 's':
            e.preventDefault();
            // Manual save
            handleSave();
            break;
        }
      }
      
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToNextSuggestion(e.shiftKey ? -1 : 1);
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveSuggestionId(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSuggestionId, editor]);

  // Warning for large manuscripts
  useEffect(() => {
    if (manuscriptText.length > 50000) {
      setError("Large manuscript detected - processing may take longer");
    } else {
      setError('');
    }
  }, [manuscriptText]);

  // Click handler for suggestions in editor
  useEffect(() => {
    const handleClick = (e) => {
      const suggestionEl = e.target.closest('.suggestion-highlight');
      if (suggestionEl) {
        const sugId = suggestionEl.getAttribute('data-suggestion-id');
        setActiveSuggestionId(sugId);
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Navigation functions
  function navigateToNextSuggestion(direction) {
    const pendingSuggestions = allSuggestions.filter(s => s.state === 'pending');
    if (pendingSuggestions.length === 0) return;
    
    const currentIndex = pendingSuggestions.findIndex(s => s.id === activeSuggestionId);
    let nextIndex = currentIndex + direction;
    
    if (nextIndex < 0) nextIndex = pendingSuggestions.length - 1;
    if (nextIndex >= pendingSuggestions.length) nextIndex = 0;
    
    setActiveSuggestionId(pendingSuggestions[nextIndex].id);
  }

  // Core handlers
  function handleAccept(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;
    
    undoManager.current.save({ 
      text: manuscriptText, 
      suggestions: allSuggestions, 
      sugId, 
      actionType: "accept" 
    });
    
    // Replace text in editor
    const { from, to } = sug;
    editor.chain().focus().setTextSelection({ from, to }).insertContent(sug.suggestion).run();
    
    // Update suggestion state
    setAllSuggestions(prev => prev.map(s => 
      s.id === sugId ? { ...s, state: "accepted" } : s
    ));
    
    // Track action
    trackSuggestionAction('accept', sug.editType, editLevel);
  }

  function handleReject(sugId) {
    undoManager.current.save({ 
      text: manuscriptText, 
      suggestions: allSuggestions, 
      sugId, 
      actionType: "reject" 
    });
    
    setAllSuggestions(prev => prev.map(s => 
      s.id === sugId ? { ...s, state: "rejected" } : s
    ));
    
    const sug = allSuggestions.find(s => s.id === sugId);
    if (sug) trackSuggestionAction('reject', sug.editType, editLevel);
  }

  function handleRevise(sugId, newValue) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;
    
    undoManager.current.save({ 
      text: manuscriptText, 
      suggestions: allSuggestions, 
      sugId, 
      actionType: "revise" 
    });
    
    // Replace with revised text
    const { from, to } = sug;
    editor.chain().focus().setTextSelection({ from, to }).insertContent(newValue).run();
    
    setAllSuggestions(prev => prev.map(s => 
      s.id === sugId ? { ...s, state: "revised", revision: newValue } : s
    ));
    
    trackSuggestionAction('revise', sug.editType, editLevel);
  }

  function handleUndo() {
    const lastAction = undoManager.current.history[undoManager.current.history.length - 1];
    if (lastAction) {
      setManuscriptText(lastAction.text);
      setAllSuggestions(lastAction.suggestions);
      if (editor) editor.commands.setContent(lastAction.text);
      undoManager.current.history.pop();
    }
  }

  function handleRefreshHighlights() {
    setAllSuggestions(prev => realignSuggestions(manuscriptText, prev));
  }

  // Manuscript control functions
  function handlePaste() {
    const val = prompt("Paste manuscript text:");
    if (val) {
      setManuscriptText(val);
      if (editor) editor.commands.setContent(val);
      setAllSuggestions([]);
      if (setValue) setValue(val);
    }
  }

  function handleClear() {
    if (window.confirm("Clear current manuscript? This cannot be undone.")) {
      const defaultText = "Paste or type your manuscript here. Start editing...";
      setManuscriptText(defaultText);
      if (editor) editor.commands.setContent(defaultText);
      setAllSuggestions([]);
      if (setValue) setValue(defaultText);
    }
  }

  async function handleGetSuggestions() {
    setLoading(true);
    setError('');
    
    try {
      if (onGetSuggestions) {
        const suggestions = await onGetSuggestions(manuscriptText, editLevel);
        setAllSuggestions(suggestions.map(s => ({
          ...s,
          id: s.id || uuidv4(),
          state: s.state || 'pending'
        })));
      } else {
        // Default API call
        const response = await fetch('/api/gpt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: manuscriptText,
            editType: ['Line', 'Copy'],
            mode: 'Specific Edits',
            editLevel
          })
        });
        
        if (!response.ok) throw new Error('Failed to get suggestions');
        
        const data = await response.json();
        setAllSuggestions((data.suggestions || []).map(s => ({
          ...s,
          id: s.id || uuidv4(),
          state: s.state || 'pending'
        })));
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setError('Failed to get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    try {
      setAutoSaveStatus('saving');
      localStorage.setItem('lulu-manuscript-backup', JSON.stringify({
        text: manuscriptText,
        suggestions: allSuggestions,
        timestamp: Date.now()
      }));
      setAutoSaveStatus('saved');
      lastSaveRef.current = Date.now();
    } catch (e) {
      setAutoSaveStatus('error');
      console.error('Manual save failed:', e);
    }
  }

  // Analytics tracking
  function trackSuggestionAction(action, suggestionType, editLevel) {
    try {
      const analytics = JSON.parse(localStorage.getItem('lulu-analytics') || '[]');
      analytics.push({
        action,
        suggestionType,
        editLevel,
        timestamp: Date.now()
      });
      localStorage.setItem('lulu-analytics', JSON.stringify(analytics.slice(-1000)));
    } catch (e) {
      console.warn('Analytics tracking failed:', e);
    }
  }

  // Progress calculation
  const progress = useMemo(() => {
    const total = allSuggestions.length;
    const completed = allSuggestions.filter(s => s.state !== 'pending').length;
    return { total, completed, percentage: total ? Math.round((completed / total) * 100) : 0 };
  }, [allSuggestions]);

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#9333ea", fontWeight: 800, fontSize: 32, marginBottom: 16 }}>
          Lulu Manuscript Editor
        </h1>
        
        {/* Stats Panel */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16, 
          padding: 12, 
          background: '#f3f4f6', 
          borderRadius: 8 
        }}>
          <div>
            <strong>Words:</strong> {wordCount}
          </div>
          <div>
            <strong>Reading time:</strong> {readingTime} min
          </div>
          <div>
            <strong>Authenticity:</strong> {authenticity}%
          </div>
          <div>
            <strong>Auto-save:</strong> 
            <span style={{ 
              marginLeft: 8, 
              color: autoSaveStatus === 'saved' ? 'green' : autoSaveStatus === 'saving' ? 'orange' : 'red' 
            }}>
              {autoSaveStatus}
            </span>
          </div>
        </div>

        {/* Progress Indicator */}
        {progress.total > 0 && (
          <div style={{ 
            marginBottom: 16, 
            padding: 12, 
            background: '#e0e7ff', 
            borderRadius: 8 
          }}>
            <div style={{ marginBottom: 8 }}>
              <strong>{editLevel} Edit Progress:</strong> {progress.completed}/{progress.total} ({progress.percentage}%)
            </div>
            <div style={{ 
              height: 20, 
              background: '#cbd5e1', 
              borderRadius: 10, 
              overflow: 'hidden' 
            }}>
              <div style={{ 
                height: '100%', 
                width: `${progress.percentage}%`, 
                background: '#a78bfa', 
                transition: 'width 0.3s ease' 
              }} />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div style={{ 
            marginBottom: 16, 
            padding: 12, 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: 8 
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: 'wrap' }}>
        <button 
          onClick={handlePaste} 
          style={{ 
            background: "#a78bfa", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: "pointer"
          }}
        >
          Paste Manuscript
        </button>
        <button 
          onClick={handleClear} 
          style={{ 
            background: "#ef4444", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: "pointer"
          }}
        >
          Clear
        </button>
        <button 
          onClick={handleGetSuggestions} 
          disabled={loading}
          style={{ 
            background: loading ? "#9ca3af" : "#2563eb", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Getting Suggestions..." : "Get Suggestions"}
        </button>
        <button 
          onClick={handleRefreshHighlights} 
          style={{ 
            background: "#60a5fa", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: "pointer"
          }}
        >
          Refresh Highlights
        </button>
        <button 
          onClick={handleUndo} 
          disabled={undoManager.current.history.length === 0}
          style={{ 
            background: undoManager.current.history.length === 0 ? "#e5e7eb" : "#6b7280", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: undoManager.current.history.length === 0 ? "not-allowed" : "pointer"
          }}
        >
          Undo
        </button>
        <button 
          onClick={handleSave} 
          style={{ 
            background: "#10b981", 
            color: "#fff", 
            padding: "8px 20px", 
            borderRadius: 8, 
            fontWeight: 600, 
            border: "none",
            cursor: "pointer"
          }}
        >
          Save (Ctrl+S)
        </button>
      </div>

      {/* Main editor */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: 24,
        alignItems: 'start'
      }}>
        {/* Editor pane */}
        <div>
          <div style={{ 
            border: "2px solid #a78bfa", 
            borderRadius: 12, 
            padding: 16, 
            background: "#fff",
            minHeight: 400,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}>
            {editor && <EditorContent editor={editor} />}
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div style={{ 
            marginTop: 12, 
            padding: 12, 
            background: '#f9fafb', 
            borderRadius: 8,
            fontSize: 14,
            color: '#6b7280'
          }}>
            <strong>Keyboard shortcuts:</strong> Ctrl+Enter (accept) • Ctrl+Backspace (reject) • Tab (navigate) • Esc (deselect) • Ctrl+S (save)
          </div>
        </div>

        {/* Suggestions panel */}
        <div style={{ 
          background: '#f9fafb', 
          borderRadius: 12, 
          padding: 16,
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "#2563eb" }}>
            Edit Suggestions ({allSuggestions.filter(s => s.state === 'pending').length} pending)
          </h3>
          
          {allSuggestions.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>
              No suggestions yet. Click "Get Suggestions" to start.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allSuggestions.map((sug, idx) => (
                <div
                  key={sug.id}
                  style={{
                    padding: 12,
                    background: sug.id === activeSuggestionId ? '#e0e7ff' : sug.color || '#fef3c7',
                    border: `2px solid ${sug.id === activeSuggestionId ? '#6366f1' : '#fcd34d'}`,
                    borderRadius: 8,
                    opacity: sug.state === 'pending' ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    cursor: sug.state === 'pending' ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  onClick={() => sug.state === 'pending' && setActiveSuggestionId(sug.id)}
                >
                  {/* Badge */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 14,
                    color: '#a16207',
                    background: '#fde68a',
                    borderRadius: 12,
                    padding: '2px 8px',
                    fontWeight: 700
                  }}>
                    #{idx + 1}
                  </div>
                  
                  {/* Content */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Original:</strong> 
                      <span style={{ color: '#991b1b', marginLeft: 8 }}>{sug.original}</span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Suggestion:</strong> 
                      <span style={{ color: '#2563eb', marginLeft: 8 }}>
                        {sug.state === 'revised' ? sug.revision : sug.suggestion}
                      </span>
                    </div>
                    {sug.why && (
                      <div style={{ fontSize: 14, color: '#059669', fontStyle: 'italic' }}>
                        Why: {sug.why}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {sug.state === 'pending' ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(sug.id);
                        }}
                        style={{
                          background: '#22c55e',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(sug.id);
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newValue = prompt('Enter revised text:', sug.suggestion);
                          if (newValue) handleRevise(sug.id, newValue);
                        }}
                        style={{
                          background: '#facc15',
                          color: '#1e293b',
                          padding: '4px 12px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Revise
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      marginTop: 8, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}>
                      <span style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: sug.state === 'accepted' ? '#22c55e' : sug.state === 'rejected' ? '#ef4444' : '#facc15' 
                      }}>
                        {sug.state.charAt(0).toUpperCase() + sug.state.slice(1)}
                      </span>
                      <button
                        onClick={() => {
                          const snapshot = undoManager.current.undo(sug.id);
                          if (snapshot) {
                            setManuscriptText(snapshot.text);
                            setAllSuggestions(snapshot.suggestions);
                            if (editor) editor.commands.setContent(snapshot.text);
                          }
                        }}
                        style={{
                          background: '#e5e7eb',
                          color: '#374151',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: 'none',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Undo
                      </button>
                    </div>
                  )}
                  
                  {/* Error indicator */}
                  {sug.alignError && (
                    <div style={{ 
                      marginTop: 8, 
                      color: '#ef4444', 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      ⚠️ Text not found in manuscript
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export as dynamic component for Next.js
export default dynamic(() => Promise.resolve(MergedManuscriptEditor), {
  ssr: false
});