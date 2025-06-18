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

// ENHANCED: Suggestions highlighting extension with better performance and click handling
const SuggestionsHighlightExtension = Extension.create({
  name: 'suggestionsHighlight',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('suggestionsHighlight'),
        props: {
          decorations: (state) => {
            const suggestions = this.options.getSuggestions ? this.options.getSuggestions() : [];
            if (!suggestions.length) return DecorationSet.empty;
            
            const decorations = [];
            const text = state.doc.textContent;
            
            suggestions.forEach((suggestion) => {
              // Only highlight pending suggestions
              if (suggestion.state !== 'pending') return;
              
              const positions = findAllPositions(text, suggestion.original);
              if (positions.length === 0) return;
              
              // Choose the best position (prefer exact match or closest to expected position)
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
              
              // Find the actual position in the document
              let charCount = 0;
              let found = false;
              
              state.doc.descendants((node, pos) => {
                if (found) return false;
                
                if (node.isText) {
                  const startInNode = Math.max(0, bestPosition.from - charCount);
                  const searchText = node.text.substring(startInNode);
                  const index = searchText.indexOf(suggestion.original);
                  
                  if (index !== -1) {
                    const start = pos + startInNode + index;
                    const end = start + suggestion.original.length;
                    
                    // Verify we're within document bounds
                    if (start >= 0 && end <= state.doc.content.size) {
                      decorations.push(
                        Decoration.inline(start, end, {
                          class: `lulu-suggestion suggestion-highlight-${suggestion.id}`,
                          'data-suggestion-id': suggestion.id,
                          'data-suggestion-idx': suggestion.idx,
                          style: `
                            background-color: ${suggestion.color || '#ffe29b'}; 
                            border-radius: 4px; 
                            padding: 2px 4px;
                            margin: 0 1px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            border: 2px solid transparent;
                            ${suggestion.alignError ? 'opacity: 0.6; border-color: #ef4444;' : ''}
                          `
                        })
                      );
                      found = true;
                    }
                  }
                  charCount += node.text.length;
                } else if (node.isBlock) {
                  charCount += 1; // Account for block separators
                }
              });
            });
            
            return DecorationSet.create(state.doc, decorations);
          },
          
          // ENHANCED: Better click handling for suggestions
          handleClick: (view, pos, event) => {
            const target = event.target.closest('.lulu-suggestion');
            if (target) {
              const suggestionId = target.getAttribute('data-suggestion-id');
              const suggestionIdx = target.getAttribute('data-suggestion-idx');
              
              if (suggestionId && suggestionIdx !== null) {
                // Dispatch custom event that parent can listen to
                const customEvent = new CustomEvent('suggestionClick', {
                  detail: {
                    suggestionId,
                    suggestionIdx: parseInt(suggestionIdx),
                    element: target
                  }
                });
                document.dispatchEvent(customEvent);
                return true; // Prevent default click handling
              }
            }
            return false;
          }
        },
        
        // ENHANCED: Handle suggestion state changes
        appendTransaction: (transactions, oldState, newState) => {
          // Check if content changed and update suggestion positions if needed
          const contentChanged = transactions.some(tr => tr.docChanged);
          if (contentChanged && this.options.onContentChange) {
            // Debounce content change notifications
            clearTimeout(this.contentChangeTimeout);
            this.contentChangeTimeout = setTimeout(() => {
              this.options.onContentChange(newState.doc.textContent);
            }, 300);
          }
          return null;
        }
      }),
    ];
  },
});

const LuluTipTapComponent = ({
  value = "",
  setValue = () => {},
  initialText = "",
  readOnly = false,
  // Integration props from index.js
  specificEdits = [],
  onAcceptSpecific = () => {},
  onRejectSpecific = () => {},
  onReviseSpecific = () => {},
  showHighlights = true
}) => {
  // DEBUG: Enhanced logging
  console.log('🔥 LuluTipTap render:', {
    specificEditsCount: specificEdits.length,
    showHighlights,
    textLength: value.length,
    readOnly
  });

  // ENHANCED: Transform specificEdits with better error handling and validation
  const transformedSuggestions = specificEdits
    .filter(edit => edit && edit.original) // Filter out invalid edits
    .map((edit, idx) => ({
      id: edit.id || `edit_${idx}_${Date.now()}`, // Ensure unique IDs
      original: edit.original || "",
      suggestion: edit.suggestion || "",
      state: edit.state || 'pending',
      color: getColorForEditType(edit.editType),
      from: edit.start, // Use start instead of from for consistency
      to: edit.end,     // Use end instead of to for consistency
      editType: edit.editType,
      idx: idx,
      alignError: edit.start === null || edit.end === null // Flag alignment issues
    }));

  console.log('📝 Transformed suggestions:', transformedSuggestions.length, transformedSuggestions);

  const undoManager = useRef(new UndoManager());
  // ENHANCED: Use ref with better state management
  const suggestionsRef = useRef([]);
  const editorRef = useRef(null);

  // ENHANCED: Update suggestions ref with validation
  useEffect(() => {
    const activeSuggestions = showHighlights ? transformedSuggestions : [];
    suggestionsRef.current = activeSuggestions;
    
    console.log('📊 Updated suggestionsRef:', {
      count: suggestionsRef.current.length,
      pending: suggestionsRef.current.filter(s => s.state === 'pending').length,
      withErrors: suggestionsRef.current.filter(s => s.alignError).length
    });
  }, [transformedSuggestions, showHighlights]);

  // ENHANCED: Editor configuration with better content sync
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      SuggestionsHighlightExtension.configure({
        getSuggestions: () => suggestionsRef.current,
        onContentChange: (textContent) => {
          // Optional: Handle content changes for suggestion realignment
          console.log('📝 Content changed, text length:', textContent.length);
        }
      })
    ],
    content: value || initialText,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      if (newContent !== value) {
        setValue(newContent);
        console.log('📝 Editor content updated via onUpdate');
      }
    },
    immediatelyRender: false,
  });

  // Store editor reference
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // ENHANCED: Content synchronization with conflict detection
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const currentContent = editor.getHTML();
      
      // Prevent unnecessary updates that could cause cursor jumping
      if (value.trim() !== currentContent.trim()) {
        console.log('🔄 Syncing editor content:', {
          incoming: value.substring(0, 100) + '...',
          current: currentContent.substring(0, 100) + '...',
          lengthDiff: value.length - currentContent.length
        });
        
        // Store cursor position before update
        const { from, to } = editor.state.selection;
        
        editor.commands.setContent(value, false);
        
        // Attempt to restore cursor position if it's still valid
        setTimeout(() => {
          try {
            if (from <= editor.state.doc.content.size) {
              editor.commands.setTextSelection({ from: Math.min(from, editor.state.doc.content.size), to: Math.min(to, editor.state.doc.content.size) });
            }
          } catch (e) {
            console.warn('Could not restore cursor position:', e);
          }
        }, 0);
      }
    }
  }, [value, editor]);

  // ENHANCED: Force decoration updates with better performance
  useEffect(() => {
    if (editor && editor.view) {
      // Debounce decoration updates to avoid excessive re-renders
      const timeoutId = setTimeout(() => {
        try {
          // Force update decorations by triggering a view update
          editor.view.updateState(editor.view.state);
          console.log('🎨 Forced decoration update');
        } catch (e) {
          console.warn('Error updating decorations:', e);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [transformedSuggestions, showHighlights, editor]);

  // ENHANCED: Dynamic CSS with better performance and cleanup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const styleId = "luluHighlightStyle";
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    // Generate CSS for all suggestion states
    const css = transformedSuggestions.map(s => `
      .suggestion-highlight-${s.id} { 
        background-color: ${s.color}; 
        border-radius: 4px; 
        padding: 2px 4px;
        margin: 0 1px;
        transition: all 0.2s ease;
        cursor: pointer;
        border: 2px solid transparent;
        ${s.alignError ? 'opacity: 0.6; border-color: #ef4444;' : ''}
      }
      .suggestion-highlight-${s.id}:hover { 
        opacity: 0.8;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .suggestion-highlight-${s.id}.active {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
      }
    `).join('\n');
    
    styleElement.innerHTML = css;
    
    // Cleanup function
    return () => {
      if (transformedSuggestions.length === 0) {
        styleElement.innerHTML = '';
      }
    };
  }, [transformedSuggestions]);

  // ENHANCED: Click handler with better suggestion management
  useEffect(() => {
    const handleSuggestionClick = (e) => {
      const { suggestionId, suggestionIdx, element } = e.detail;
      const suggestion = transformedSuggestions.find(s => s.id === suggestionId);
      
      if (suggestion) {
        console.log('🎯 Suggestion clicked:', {
          id: suggestionId,
          idx: suggestionIdx,
          original: suggestion.original,
          editType: suggestion.editType
        });
        
        // Highlight the clicked suggestion
        document.querySelectorAll('.lulu-suggestion').forEach(el => {
          el.classList.remove('active');
        });
        element.classList.add('active');
        
        // Emit event that parent components can listen to
        const panelEvent = new CustomEvent('focusSuggestion', {
          detail: { index: suggestionIdx, suggestion }
        });
        document.dispatchEvent(panelEvent);
      }
    };
    
    document.addEventListener('suggestionClick', handleSuggestionClick);
    return () => document.removeEventListener('suggestionClick', handleSuggestionClick);
  }, [transformedSuggestions]);

  // ENHANCED: Expose editor methods for external control
  useEffect(() => {
    if (editor) {
      // Expose useful methods on window for debugging
      window.luluEditor = {
        getContent: () => editor.getHTML(),
        setContent: (content) => editor.commands.setContent(content),
        getSelection: () => editor.state.selection,
        findText: (text) => {
          const content = editor.state.doc.textContent;
          const index = content.indexOf(text);
          return index !== -1 ? { from: index, to: index + text.length } : null;
        },
        replaceText: (from, to, replacement) => {
          editor.chain().focus().deleteRange({ from, to }).insertContent(replacement).run();
        }
      };
    }
    
    return () => {
      if (window.luluEditor) {
        delete window.luluEditor;
      }
    };
  }, [editor]);

  // ENHANCED: Error boundary for editor crashes
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error) => {
      console.error('TipTap Editor Error:', error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Error fallback
  if (hasError) {
    return (
      <div className="border border-red-300 rounded min-h-[14rem] p-3 text-base bg-red-50">
        <div className="text-red-600 mb-2">⚠️ Editor Error</div>
        <div className="text-sm text-red-500 mb-4">
          The editor encountered an error. Please refresh the page or try a different approach.
        </div>
        <textarea
          className="w-full h-32 p-2 border rounded text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Fallback text editor..."
        />
      </div>
    );
  }

  // ENHANCED: Main editor with better styling and loading states
  return (
    <div className="relative">
      {/* Loading indicator */}
      {!editor && (
        <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center z-10">
          <div className="text-gray-500">Loading editor...</div>
        </div>
      )}
      
      {/* Editor container */}
      <div 
        className="border rounded min-h-[14rem] p-3 text-base whitespace-pre-wrap font-serif relative"
        style={{
          outline: showHighlights ? '2px solid #a78bfa' : '2px solid #d1d5db',
          minHeight: '300px',
          lineHeight: '1.6'
        }}
      >
        {editor && <EditorContent editor={editor} />}
        
        {/* Suggestion count indicator */}
        {showHighlights && transformedSuggestions.length > 0 && (
          <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
            {transformedSuggestions.filter(s => s.state === 'pending').length} suggestions
          </div>
        )}
        
        {/* Alignment error indicator */}
        {transformedSuggestions.some(s => s.alignError) && (
          <div className="absolute bottom-2 right-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
            ⚠️ Some suggestions may be misaligned
          </div>
        )}
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Editor: {editor ? '✅' : '❌'} | 
          Suggestions: {transformedSuggestions.length} | 
          Highlights: {showHighlights ? '✅' : '❌'} | 
          Content: {value.length} chars
        </div>
      )}
    </div>
  );
};

// ENHANCED: Color function with more edit types and better contrast
function getColorForEditType(editType) {
  const colors = {
    'Developmental': '#fed7aa', // Light orange - major structural changes
    'Structural': '#d1fae5',    // Light green - organization
    'Line': '#ffe29b',          // Yellow - style and flow
    'Copy': '#fecaca',          // Light red - grammar and mechanics
    'Proof': '#e0e7ff',         // Light blue - typos and formatting
    'Voice': '#f3e8ff',         // Light purple - tone and voice
    'Content': '#fde68a',       // Light amber - content additions
    'Cut': '#fee2e2',           // Very light red - deletions
    'Other': '#f3f4f6'          // Light gray - miscellaneous
  };
  return colors[editType] || colors['Other'];
}

export default dynamic(() => Promise.resolve(LuluTipTapComponent), {
  ssr: false
});