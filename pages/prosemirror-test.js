// pages/prosemirror-test.js
// Minimal test page for experimenting with suggestion acceptance & highlighting

"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// ProseMirror core
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

// Lulu schema & plugin helpers
import { luluSchema } from "../schemas/luluSchema";
import { createSuggestionPlugin, acceptSuggestion as pmAcceptSuggestion, clearAllSuggestions } from "../plugins/suggestionPlugin";
import SuggestionManager from "../utils/suggestionManager";
import { docToText, createDocFromText } from "../utils/prosemirrorHelpers";

function PMTestPage() {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  const managerRef = useRef(null);
  const [log, setLog] = useState([]);
  const [initialised, setInitialised] = useState(false);

  // Initialise ProseMirror once
  useEffect(() => {
    if (!editorContainerRef.current || viewRef.current) return;

    const handleAccept = (suggestionId) => {
      if (!viewRef.current) return;
      // Perform replacement & remove decoration
      pmAcceptSuggestion(viewRef.current, suggestionId);
      setLog((l) => [...l, `✔️ Accepted ${suggestionId}`]);
    };

    // Initial content
    const startingText =
      "Looking down at the churning sea below, she stood at the edge as the wind was blowing very hard through her hair.";

    const doc = createDocFromText(startingText, luluSchema);

    const state = EditorState.create({
      doc,
      plugins: [createSuggestionPlugin({ onAccept: handleAccept })],
    });

    const view = new EditorView(editorContainerRef.current, {
      state,
      dispatchTransaction: (tr) => {
        const newState = view.state.apply(tr);
        view.updateState(newState);
        if (tr.docChanged) {
          setLog((l) => [...l, `📝 Doc updated (${docToText(newState.doc).length} chars)`]);
        }
      },
    });

    viewRef.current = view;
    // ... inside the useEffect hook in PMTestPage
    
    viewRef.current = view;
    managerRef.current = new SuggestionManager(view);

    // These two lines make the view and manager available in the console for testing
    window.view = view;
    window.managerRef = managerRef;

    setInitialised(true);

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
      managerRef.current = null;
    };
  }, []);

  const loadDemo = () => {
    if (!managerRef.current) return;
    managerRef.current.loadDemoSuggestions();
    setLog((l) => [...l, "🎨 Demo suggestions loaded"]);
  };

  const clear = () => {
    if (!managerRef.current || !viewRef.current) return;
    clearAllSuggestions(viewRef.current);
    setLog((l) => [...l, "🧹 Cleared suggestions"]);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">ProseMirror Suggestion-Test</h1>
      <div className="flex gap-2">
        <button
          onClick={loadDemo}
          className="px-3 py-1 bg-purple-600 text-white rounded disabled:opacity-50"
          disabled={!initialised}
        >
          Load demo suggestions
        </button>
        <button
          onClick={clear}
          className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
          disabled={!initialised}
        >
          Clear highlights
        </button>
      </div>

      {/* Editor Container */}
      <div
        ref={editorContainerRef}
        className="border rounded min-h-[200px] p-3 whitespace-pre-wrap font-serif"
      />

      {/* Log */}
      <div className="bg-gray-50 border rounded p-3 text-sm max-h-56 overflow-auto">
        {log.map((entry, idx) => (
          <div key={idx}>{entry}</div>
        ))}
      </div>

      {/* basic highlight style */}
      <style jsx global>{`
        .suggestion-highlight {
          background: rgba(255, 235, 59, 0.45);
          cursor: pointer;
          transition: background 0.2s;
        }
        .suggestion-highlight:hover {
          background: rgba(255, 235, 59, 0.7);
        }
      `}</style>
    </div>
  );
}

export default dynamic(() => Promise.resolve(PMTestPage), { ssr: false }); 