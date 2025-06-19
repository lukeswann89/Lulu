// /components/ProseMirrorEditor.jsx
// FIXED: Actually calls the plugin to apply suggestions

"use client";
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import dynamic from 'next/dynamic';

// Import your proven ProseMirror foundation
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { luluSchema } from "../schemas/luluSchema";
import { createSuggestionPlugin, setSuggestions, acceptSuggestion as pmAcceptSuggestion } from "../plugins/suggestionPlugin";
import { createDocFromText, docToText } from "../utils/prosemirrorHelpers";
import { SuggestionManager } from "../utils/suggestionManager";

const ProseMirrorIntegration = forwardRef(({
  value = "",
  setValue = () => {},
  specificEdits = [],
  onAcceptSpecific = () => {},
  onRejectSpecific = () => {},
  onReviseSpecific = () => {},
  showHighlights = true,
  debug = false,
  ...props
}, ref) => {

  // DEBUG logging to match your existing patterns
  if (debug) {
    console.log('🔥 ProseMirror Integration render:', {
      specificEditsCount: specificEdits.length,
      showHighlights,
      textLength: value.length,
      timestamp: new Date().toISOString()
    });
  }

  // State and refs
  const [editor, setEditor] = useState(null);
  const [hasError, setHasError] = useState(false);
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const suggestionManagerRef = useRef(null);
  const lastContentRef = useRef("");
  const initialContentSet = useRef(false);

  // Transform specificEdits to match your ProseMirror foundation format
  const transformedSuggestions = specificEdits
    .filter(edit => edit && edit.original) // Filter invalid edits
    .map((edit, idx) => ({
      id: edit.id || `edit_${idx}_${Date.now()}`,
      original: edit.original || "",
      suggestion: edit.suggestion || "",
      state: edit.state || 'pending',
      type: edit.editType || 'Line',
      from: edit.start,
      to: edit.end,
      idx: idx,
      color: getColorForEditType(edit.editType),
      // FIXED: Add fields needed by plugin
      editType: edit.editType || 'Line',
      start: edit.start,
      end: edit.end,
      hasValidOffsets: edit.hasValidOffsets !== false
    }));

  if (debug) {
    console.log('📝 Transformed suggestions:', transformedSuggestions.length, transformedSuggestions);
  }

  // Initialize ProseMirror editor
  useEffect(() => {
    if (typeof window === "undefined" || editorRef.current === null || viewRef.current) return;

    try {
      const handleAccept = (suggestionId) => {
        console.log('✅ PROSEMIRROR ACCEPT TEST - ID:', suggestionId);
        
        // Call the parent component's handler
        onAcceptSpecific(suggestionId);
        
        // Tell ProseMirror to perform the replacement
        if (viewRef.current) {
          pmAcceptSuggestion(viewRef.current, suggestionId);
        }
      };

      // Create initial document
      const doc = createDocFromText(luluSchema, value || "");
      lastContentRef.current = value || "";
      initialContentSet.current = true;
      
      // Create editor state with your proven plugin
      const state = EditorState.create({
        doc,
        plugins: [
          createSuggestionPlugin({ onAccept: handleAccept }) // Use the factory
        ]
      });

      // Create editor view
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction: (transaction) => {
          const newState = view.state.apply(transaction);
          view.updateState(newState);
          
          // Update parent component ONLY when content changes via ProseMirror
          if (transaction.docChanged) {
            const newContent = docToText(newState.doc);
            lastContentRef.current = newContent; // Keep PM state as source of truth
            setValue(newContent); // Inform parent of the change
            if (debug) console.log('📝 Content updated via transaction');
          }
        }
      });

      viewRef.current = view;
      setEditor(view);

      // Initialize suggestion manager after view is created
      const suggestionManager = new SuggestionManager(view);
      suggestionManagerRef.current = suggestionManager;

      if (debug) {
        console.log('✅ ProseMirror editor initialized');
        // Expose debug methods
        window.luluProseMirror = {
          view,
          suggestionManager,
          getContent: () => docToText(view.state.doc),
          loadDemoSuggestions: () => {
            if (debug) console.log('🧪 Loading demo suggestions...');
            // This will be used for your test cases
            return suggestionManager.loadDemoSuggestions();
          }
        };
      }

    } catch (error) {
      console.error('❌ ProseMirror initialization error:', error);
      setHasError(true);
    }

    // Cleanup
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (window.luluProseMirror) {
        delete window.luluProseMirror;
      }
    };
  }, [onAcceptSpecific, debug, setValue]); // Dependencies for initialization

  // Update content ONLY when value prop changes from an external source
  useEffect(() => {
    if (viewRef.current && value !== lastContentRef.current) {
      if (debug) {
        console.log('🔄 Syncing external content change to ProseMirror');
      }
      
      const { state } = viewRef.current;
      const newDoc = createDocFromText(luluSchema, value);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      
      viewRef.current.dispatch(tr);
      lastContentRef.current = value;
    }
  }, [value, debug]);

  // FIXED: Actually update suggestions when specificEdits change
  useEffect(() => {
    if (viewRef.current) {
      try {
        if (debug) console.log('🎨 Applying suggestions to ProseMirror:', transformedSuggestions.length);
        setSuggestions(viewRef.current, transformedSuggestions);
      } catch (error) {
        console.error('❌ Suggestion update error:', error);
      }
    }
  }, [transformedSuggestions, showHighlights, debug]);

  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    getContent: () => viewRef.current ? docToText(viewRef.current.state.doc) : "",
    setContent: (content) => {
      if (viewRef.current) {
        const newDoc = createDocFromText(luluSchema, content);
        const newState = EditorState.create({
          doc: newDoc,
          plugins: viewRef.current.state.plugins
        });
        viewRef.current.updateState(newState);
        // Do NOT call setValue here, let the transaction dispatcher handle it
      }
    },
    loadDemoSuggestions: () => {
      if (suggestionManagerRef.current && viewRef.current) {
        return suggestionManagerRef.current.loadDemoSuggestions();
      }
    },
    focus: () => viewRef.current?.focus(),
    editor: viewRef.current
  }), [setValue]);

  // Error fallback that matches your existing pattern
  if (hasError) {
    return (
      <div className="border border-red-300 rounded min-h-[14rem] p-3 text-base bg-red-50">
        <div className="text-red-600 mb-2">⚠️ ProseMirror Error</div>
        <div className="text-sm text-red-500 mb-4">
          The ProseMirror editor encountered an error. Please refresh the page.
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

  // Main editor UI that matches your existing styling
  return (
    <div className="relative">
      {/* Loading indicator */}
      {!editor && (
        <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center z-10">
          <div className="text-gray-500">Loading ProseMirror editor...</div>
        </div>
      )}
      
      {/* Editor container with your existing styles */}
      <div 
        ref={editorRef}
        className="border rounded min-h-[14rem] p-3 text-base whitespace-pre-wrap font-serif relative prosemirror-editor"
        style={{
          outline: showHighlights ? '2px solid #a78bfa' : '2px solid #d1d5db',
          minHeight: '300px',
          lineHeight: '1.6'
        }}
      />
      
      {/* Suggestion count indicator */}
      {showHighlights && transformedSuggestions.length > 0 && (
        <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
          {transformedSuggestions.filter(s => s.state === 'pending').length} suggestions
        </div>
      )}
      
      {/* Debug info */}
      {debug && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          ProseMirror: {editor ? '✅' : '❌'} | 
          Suggestions: {transformedSuggestions.length} | 
          Highlights: {showHighlights ? '✅' : '❌'} | 
          Content: {value.length} chars
        </div>
      )}
    </div>
  );
});

ProseMirrorIntegration.displayName = 'ProseMirrorIntegration';

// Color function that matches your existing TipTap implementation
function getColorForEditType(editType) {
  const colors = {
    'Developmental': '#fed7aa', // Light orange
    'Structural': '#d1fae5',    // Light green
    'Line': '#ffe29b',          // Yellow
    'Copy': '#fecaca',          // Light red
    'Proof': '#e0e7ff',         // Light blue
    'Voice': '#f3e8ff',         // Light purple
    'Content': '#fde68a',       // Light amber
    'Cut': '#fee2e2',           // Very light red
    'Other': '#f3f4f6'          // Light gray
  };
  return colors[editType] || colors['Other'];
}

// Export with dynamic loading to match your existing pattern
export default dynamic(() => Promise.resolve(ProseMirrorIntegration), {
  ssr: false
});