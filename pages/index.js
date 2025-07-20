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
import { getEditMeta } from '../utils/editorConfig';
import SpecificEditsPanel from '../components/SpecificEditsPanel';
import SuggestionConflictCard from '../components/SuggestionConflictCard';
import EditorialPlanner from '../components/EditorialPlanner';
import WorkflowTracker from '../components/WorkflowTracker';

// Workflow Imports
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';


function IndexV2() {
    // --- Connect to the Workflow "Mind" and "Will" ---
    const { state: workflowState } = useWorkflow();
    const actions = useWorkflowActions();
    const { currentPhase, isProcessing, workflowPhases } = workflowState;

    // --- Component-Specific State ---
    const [manuscriptText, setManuscriptText] = useState("The report she submitted was very, really unprofessional.");
    const [suggestions, setSuggestions] = useState([]);
    const [activeConflictGroup, setActiveConflictGroup] = useState(null);
    const [editorLog, setEditorLog] = useState([]);
    const editorContainerRef = useRef(null);
    const viewRef = useRef(null);


    // --- ProseMirror Initialization Effect ---
    useEffect(() => {
        if (!editorContainerRef.current || viewRef.current) return;

        const handleConflictClick = (conflictGroup) => {
            setEditorLog(l => [...l, `💡 Conscience: Presenting choice for conflict ${conflictGroup.id}`]);
            setActiveConflictGroup(conflictGroup);
        };

        const handleDirectAccept = (suggestionId) => {
            handleAcceptChoice(suggestionId);
        };

        const doc = createDocFromText(luluSchema, manuscriptText);

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
                    setManuscriptText(newText);
                }
            },
        });

        viewRef.current = view;
        window.view = view;
        setEditorLog((l) => [...l, "✅ Editor with Conscience Initialized"]);

        return () => { view.destroy(); viewRef.current = null; };
    }, []);

    // --- Suggestion Update & Reset Effect ---
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;

        // --- FIXED: Add a "circuit breaker" to prevent an infinite loop ---
        if (currentPhase === 'assessment' && suggestions.length > 0) {
            setSuggestions([]);
            // Return early to avoid running the rest of the effect
            return;
        }

        pmSetSuggestions(view, suggestions);
        setEditorLog(l => [...l, `🧠 Deep Brain updated. Drawing ${suggestions.length} highlights.`]);
    }, [suggestions, currentPhase]);

    // --- Workflow Phase Change Effect ---
    useEffect(() => {
        const handlePhaseChange = async () => {
            if (currentPhase !== 'assessment' && currentPhase !== 'complete') {
                setEditorLog(l => [...l, `Phase changed to '${currentPhase}'. Fetching suggestions...`]);
                
                const newSuggestions = await actions.fetchSuggestionsForPhase(manuscriptText);
                
                const suggestionsWithIds = newSuggestions.map(sug => ({
                    ...sug,
                    id: generateSuggestionId(sug.original, sug.suggestion)
                }));

                const suggestionsWithPmPositions = suggestionsWithIds.map(sug => {
                    if (!viewRef.current) return null;
                    const position = findPositionOfText(viewRef.current.state.doc, sug.original);
                    if (position) {
                        return { ...sug, from: position.from, to: position.to };
                    }
                    return null;
                }).filter(Boolean);
                
                const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithPmPositions);
                
                setSuggestions(groupedSuggestions);
            }
        };

        handlePhaseChange();
    }, [currentPhase]);


    // --- Action Handlers ---
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
            setSuggestions([]);
        }
        setActiveConflictGroup(null);
    }, []);

    
    // --- RENDER ---
    const phaseDisplayNames = {
        developmental: 'Developmental',
        structural: 'Structural',
        line: 'Line Edit',
        copy: 'Copy Edit',
        proof: 'Proofreading',
    };
    const currentIndex = workflowPhases.indexOf(currentPhase);
    const nextPhase = currentIndex < workflowPhases.length - 1 ? workflowPhases[currentIndex + 1] : null;
    const currentPhaseDisplay = phaseDisplayNames[currentPhase] || currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1);
    const nextPhaseDisplay = nextPhase ? (phaseDisplayNames[nextPhase] || nextPhase.charAt(0).toUpperCase() + nextPhase.slice(1)) : '';


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

                    {/* RHS: Workflow & Suggestion Panel */}
                    <div className="w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit min-w-[24rem]">
                      {currentPhase === 'assessment' ? (
                        <EditorialPlanner manuscriptText={manuscriptText} />
                      ) : isProcessing ? (
                        <div className="p-4 text-center">
                          <p className="text-lg font-semibold animate-pulse text-purple-700">Fetching Suggestions...</p>
                          <p className="text-sm text-gray-500 mt-2">Lulu is beginning the '{currentPhaseDisplay}' edit.</p>
                        </div>
                      ) : (
                        <>
                          <WorkflowTracker />
                          <div className="flex justify-between items-center my-4">
                            <h3 className="text-xl font-bold text-gray-800">Suggestions</h3>
                            <button
                              className="text-xs text-purple-600 hover:underline"
                              onClick={actions.resetWorkflow}
                            >
                              &larr; Start Over
                            </button>
                          </div>
                          
                          {activeConflictGroup ? (
                            <SuggestionConflictCard
                              conflictGroup={activeConflictGroup}
                              onAccept={handleAcceptChoice}
                            />
                          ) : (
                            <SpecificEditsPanel
                              suggestions={suggestions}
                              onAccept={handleAcceptChoice}
                              onReject={() => {}}
                              onRevise={() => {}}
                              getEditMeta={getEditMeta}
                            />
                          )}

                          {nextPhase && nextPhase !== 'complete' && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={actions.completeCurrentPhase}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>Complete {currentPhaseDisplay}</span>
                                    <span className="text-xl">&rarr;</span>
                                    <span>Proceed to {nextPhaseDisplay}</span>
                                </button>
                            </div>
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