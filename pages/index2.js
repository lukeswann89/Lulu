"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// ProseMirror Core Imports
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { luluSchema } from "../schemas/luluSchema";

// Lulu's Conscience Imports
import {
    createCoreSuggestionPlugin,
    acceptSuggestion as pmAcceptSuggestion,
    setSuggestions as pmSetSuggestions,
    coreSuggestionPluginKey
} from "../plugins/coreSuggestionPlugin";
import { docToText, createDocFromText, findPositionOfText } from "../utils/prosemirrorHelpers";
import { ConflictGrouper } from '../utils/conflictGrouper';
import { generateSuggestionId } from '../utils/suggestionIdGenerator.js';

// UI & Helper Imports
import { EDIT_TYPES, getEditMeta } from '../utils/editorConfig';
import SpecificEditsPanel from '../components/SpecificEditsPanel';
import SuggestionConflictCard from '../components/SuggestionConflictCard';


function IndexV2() {
    const [text, setText] = useState("The detective, a very tired man, walked into the room. He was very sad.");
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [activeConflictGroup, setActiveConflictGroup] = useState(null);
    const [showEditOptions, setShowEditOptions] = useState(true);
    const [editorLog, setEditorLog] = useState([]);
    const editorContainerRef = useRef(null);
    const viewRef = useRef(null);

    useEffect(() => {
        if (!editorContainerRef.current || viewRef.current) return;

        const handleConflictClick = (conflictGroup) => {
            setEditorLog(l => [...l, `💡 Conscience: Presenting choice for conflict ${conflictGroup.id}`]);
            setActiveConflictGroup(conflictGroup);
        };

        const handleDirectAccept = (suggestionId) => {
            handleAcceptChoice(suggestionId);
        };

        const doc = createDocFromText(luluSchema, text);

        const state = EditorState.create({
            doc,
            plugins: [createCoreSuggestionPlugin({
                onAccept: handleDirectAccept,
                onConflictClick: handleConflictClick
            })],
        });

        const view = new EditorView(editorContainerRef.current, {
            state,
            dispatchTransaction: (tr) => {
                const newState = view.state.apply(tr);
                view.updateState(newState);
                if (tr.docChanged) {
                    const newText = docToText(newState.doc);
                    setText(newText);
                }
            },
        });

        viewRef.current = view;
        window.view = view;
        setEditorLog((l) => [...l, "✅ Editor with Conscience Initialized"]);

        return () => { view.destroy(); viewRef.current = null; };
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        pmSetSuggestions(view, suggestions);
        setEditorLog(l => [...l, `🧠 Deep Brain updated. Drawing ${suggestions.length} highlights.`]);
    }, [suggestions]);

    async function handleSubmit() {
    setLoading(true);
    setActiveConflictGroup(null);

    const view = viewRef.current;
    if (!view) { setLoading(false); return; }

    const manuscriptContent = docToText(view.state.doc);
    let suggestionsFromApi = [];

    try {
        setEditorLog(l => [...l, 'Submitting to Lulu AI...']);

        const response = await fetch('/api/specific-edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: manuscriptContent,
                mode: 'Specific Edits',
                editType: ["Developmental", "Structural", "Line", "Copy", "Proofreading"]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${errorText}`);
        }

        const apiResult = await response.json();

        if (apiResult && apiResult.suggestions) {
            if (Array.isArray(apiResult.suggestions)) {
                suggestionsFromApi = apiResult.suggestions;
            } else if (typeof apiResult.suggestions === 'object' && apiResult.suggestions !== null) {
                suggestionsFromApi = Object.values(apiResult.suggestions).flat();
            } else {
                throw new Error("The 'suggestions' key in the API response was not in a recognized format (array or object).");
            }
        } else {
            throw new Error("API response did not contain a 'suggestions' key.");
        }

        setEditorLog(l => [...l, `Lulu's AI returned ${suggestionsFromApi.length} raw suggestions.`]);

    } catch (error) {
        console.error("Error fetching suggestions from API:", error);
        setEditorLog(l => [...l, `❌ Error: ${error.message}`]);
        setLoading(false);
        return;
    }

    // --- FINALIZED LOGIC ---
    // Step 1: Give every raw suggestion from the API a unique and stable ID.
    // This resolves the "double-click" bug by ensuring the panel has the ID from the start.
    const suggestionsWithIds = suggestionsFromApi.map(sug => ({
        ...sug,
        id: generateSuggestionId(sug.original, sug.suggestion)
    }));
    setEditorLog(l => [...l, `Assigned unique IDs to ${suggestionsWithIds.length} suggestions.`]);

    // Step 2: Now, find the ProseMirror position for each newly-identified suggestion.
    const suggestionsWithPmPositions = suggestionsWithIds.map(sug => {
        const position = findPositionOfText(view.state.doc, sug.original);
        if (position) {
            return { ...sug, from: position.from, to: position.to };
        }
        console.warn(`Could not find text for suggestion: "${sug.original}"`);
        return null;
    }).filter(Boolean);

    setEditorLog(l => [...l, `Translated ${suggestionsWithPmPositions.length} suggestions into ProseMirror positions.`]);

    const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithPmPositions);

    setSuggestions(groupedSuggestions);
    setEditorLog(l => [...l, `🧠 Conscious mind processed ${groupedSuggestions.length} final suggestion items.`]);

    setLoading(false);
    setShowEditOptions(false);
}

    const handleAcceptChoice = useCallback((suggestionId) => {
    const view = viewRef.current;
    if (!view) return;

    setEditorLog(l => [...l, `✨ User chose path: ${suggestionId}`]);
    pmAcceptSuggestion(view, suggestionId);

    const newPluginState = coreSuggestionPluginKey.getState(view.state);

    if (newPluginState) {
        setSuggestions(newPluginState.suggestions);
    } else {
        console.error("Could not find plugin state after acceptance.");
        setSuggestions([]); // Fallback to an empty array
    }

    setActiveConflictGroup(null);
}, []);

    // --- RESTORED: The complete JSX for rendering the UI ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-purple-700 flex-1 mb-8">Lulu's Conscience</h1>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* LHS: Manuscript Editor */}
                    <div className="flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit">
                        <label className="font-semibold block mb-1 text-lg">Your Manuscript</label>
                        <div ref={editorContainerRef} className="border rounded min-h-[400px] p-3 whitespace-pre-wrap font-serif focus:outline-none focus:ring-2 focus:ring-purple-400" />
                        <style jsx global>{`
                           .suggestion-highlight { background: rgba(255, 235, 59, 0.5); cursor: pointer; border-bottom: 2px solid rgba(234, 179, 8, 0.7); }
                           .conflict-highlight { background: rgba(192, 132, 252, 0.4); border-bottom: 2px solid rgba(126, 34, 206, 0.6); }
                           .ProseMirror { outline: none; }
                           .ProseMirror p { margin: 0.5em 0; }
                         `}</style>
                        <div className="mt-4">
                           <details className="bg-gray-50 border rounded p-2">
                               <summary className="text-sm font-medium cursor-pointer">Developer Log ({editorLog.length})</summary>
                               <div className="mt-2 text-xs max-h-32 overflow-auto">
                                   {editorLog.slice(-15).reverse().map((entry, idx) => ( <div key={idx} className="py-1 border-b">{entry}</div> ))}
                               </div>
                           </details>
                        </div>
                    </div>

                    {/* RHS: Options + Suggestion Panel */}
                    <div className="w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit min-w-[24rem]">
                        {showEditOptions ? (
                            <button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold w-full">
                                {loading ? "Thinking..." : "Submit to Lulu (Test Conflict)"}
                            </button>
                        ) : (
                            <>
                                <button
    className="mb-6 px-4 py-2 bg-purple-600 text-white rounded font-semibold"
    onClick={() => {
        const view = viewRef.current;
        if (!view) return;

        // 1. Create a new document from the initial text
        const initialText = "The detective, a very tired man, walked into the room. He was very sad.";
        const newDoc = createDocFromText(luluSchema, initialText);

        // 2. Create and dispatch a transaction to replace the entire document content
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
        view.dispatch(tr);

        // 3. Reset the React UI state
        setShowEditOptions(true);
        setSuggestions([]);
        setActiveConflictGroup(null);
    }}
>
    &larr; Start Over
</button>
                                {activeConflictGroup ? (
                                    <SuggestionConflictCard
                                        conflictGroup={activeConflictGroup}
                                        onAccept={handleAcceptChoice}
                                    />
                                ) : (
                                    <SpecificEditsPanel
                                        suggestions={suggestions.filter(s => !s.isConflictGroup)}
                                        onAccept={handleAcceptChoice}
                                        onReject={() => {}}
                                        onRevise={() => {}}
                                        getEditMeta={getEditMeta}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default dynamic(() => Promise.resolve(IndexV2), { ssr: false });