import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { luluSchema } from "../schemas/luluSchema";
import { createCoreSuggestionPlugin as createSuggestionPlugin, setSuggestions, acceptSuggestion as pmAcceptSuggestion } from "../plugins/coreSuggestionPlugin";
import { createDocFromText, docToText } from "../utils/prosemirrorHelpers";
import { SuggestionManager } from "../utils/suggestionManager";

export const ProseMirrorIntegration = forwardRef(({
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
  if (debug) {
    console.log('🔥 ProseMirror Integration render:', {
      specificEditsCount: specificEdits.length,
      showHighlights,
      textLength: value.length,
      timestamp: new Date().toISOString()
    });
  }

  const [editor, setEditor] = useState(null);
  const [hasError, setHasError] = useState(false);
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const suggestionManagerRef = useRef(null);
  const lastContentRef = useRef("");
  const initialContentSet = useRef(false);
  const callbacksRef = useRef({ onAcceptSpecific, onRejectSpecific, onReviseSpecific });

  const transformedSuggestions = specificEdits
    .filter(edit => edit && edit.original)
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
      editType: edit.editType || 'Line',
      start: edit.start,
      end: edit.end,
      hasValidOffsets: edit.hasValidOffsets !== false
    }));

  if (debug) {
    console.log('📝 Transformed suggestions:', transformedSuggestions.length, transformedSuggestions);
  }

  useEffect(() => {
    if (typeof window === "undefined" || editorRef.current === null || viewRef.current) return;
    try {
      const handleAccept = (suggestionId) => {
        console.log('✅ PROSEMIRROR ACCEPT TEST - ID:', suggestionId);
        const currentCallback = callbacksRef.current.onAcceptSpecific;
        if (typeof currentCallback === 'function') {
          currentCallback(suggestionId);
        }
        if (viewRef.current) {
          pmAcceptSuggestion(viewRef.current, suggestionId);
        }
      };
      const doc = createDocFromText(value || "", luluSchema);
      lastContentRef.current = value || "";
      initialContentSet.current = true;
      const state = EditorState.create({
        doc,
        plugins: [
          createSuggestionPlugin({ onAccept: handleAccept })
        ]
      });
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction: (transaction) => {
          const newState = view.state.apply(transaction);
          view.updateState(newState);
          if (transaction.docChanged) {
            const newContent = docToText(newState.doc);
            lastContentRef.current = newContent;
            setValue(newContent);
            if (debug) console.log('📝 Content updated via transaction');
          }
        }
      });
      viewRef.current = view;
      setEditor(view);
      const suggestionManager = new SuggestionManager(view);
      suggestionManagerRef.current = suggestionManager;
      if (debug) {
        console.log('✅ ProseMirror editor initialized');
        window.luluProseMirror = {
          view,
          suggestionManager,
          getContent: () => docToText(view.state.doc),
          loadDemoSuggestions: () => {
            if (debug) console.log('🧪 Loading demo suggestions...');
            return suggestionManager.loadDemoSuggestions();
          }
        };
      }
    } catch (error) {
      console.error('❌ ProseMirror initialization error:', error);
      setHasError(true);
    }
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      if (window.luluProseMirror) {
        delete window.luluProseMirror;
      }
    };
  }, []);

  useEffect(() => {
    callbacksRef.current = { onAcceptSpecific, onRejectSpecific, onReviseSpecific };
  }, [onAcceptSpecific, onRejectSpecific, onReviseSpecific]);

  useEffect(() => {
    if (viewRef.current && value !== lastContentRef.current) {
      if (debug) {
        console.log('🔄 Syncing external content change to ProseMirror');
      }
      const { state } = viewRef.current;
      const newDoc = createDocFromText(value, luluSchema);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      viewRef.current.dispatch(tr);
      lastContentRef.current = value;
    }
  }, [value, debug]);

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

  useImperativeHandle(ref, () => ({
    getContent: () => viewRef.current ? docToText(viewRef.current.state.doc) : "",
    setContent: (content) => {
      if (viewRef.current) {
        const newDoc = createDocFromText(content, luluSchema);
        const newState = EditorState.create({
          doc: newDoc,
          plugins: viewRef.current.state.plugins
        });
        viewRef.current.updateState(newState);
      }
    },
    loadDemoSuggestions: () => {
      if (suggestionManagerRef.current && viewRef.current) {
        return suggestionManagerRef.current.loadDemoSuggestions();
      }
    },
    focus: () => viewRef.current?.focus(),
    editor: viewRef.current
  }), []);

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

  return (
    <div className="relative">
      {!editor && (
        <div className="absolute inset-0 bg-gray-100 rounded flex items-center justify-center z-10">
          <div className="text-gray-500">Loading ProseMirror editor...</div>
        </div>
      )}
      <div 
        ref={editorRef}
        className="border rounded min-h-[14rem] p-3 text-base whitespace-pre-wrap font-serif relative prosemirror-editor"
        style={{
          outline: showHighlights ? '2px solid #a78bfa' : '2px solid #d1d5db',
          minHeight: '300px',
          lineHeight: '1.6'
        }}
      />
      {showHighlights && transformedSuggestions.length > 0 && (
        <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
          {transformedSuggestions.filter(s => s.state === 'pending').length} suggestions
        </div>
      )}
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

function getColorForEditType(editType) {
  const colors = {
    'Developmental': '#fed7aa',
    'Structural': '#d1fae5',
    'Line': '#ffe29b',
    'Copy': '#fecaca',
    'Proof': '#e0e7ff',
    'Voice': '#f3e8ff',
    'Content': '#fde68a',
    'Cut': '#fee2e2',
    'Other': '#f3f4f6'
  };
  return colors[editType] || colors['Other'];
} 