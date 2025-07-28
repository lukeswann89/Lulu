"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
// ProseMirror Core Imports
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { luluSchema } from "../schemas/luluSchema";
import {
    createCoreSuggestionPlugin,
    coreSuggestionPluginKey,
    acceptSuggestion as pmAcceptSuggestion,
    setSuggestions as pmSetSuggestions
} from "../plugins/coreSuggestionPlugin";
import { createDocFromText, docToText, findPositionOfText } from "../utils/prosemirrorHelpers";
import { ConflictGrouper } from '../utils/conflictGrouper';
// UI & Helper Imports
import { getEditMeta } from '../utils/editorConfig';
import SpecificEditsPanel from '../components/SpecificEditsPanel';
import SuggestionConflictCard from '../components/SuggestionConflictCard';
import EditorialPlanner from '../components/EditorialPlanner';
import StrategyCard from '../components/StrategyCard';
// Workflow Imports
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';

const SUBSTANTIVE_PHASES = ['developmental', 'structural'];
const SENTENCE_LEVEL_PHASES = ['line', 'copy', 'proof'];

function IndexV2() {
    const { state: workflowState } = useWorkflow();
    const actions = useWorkflowActions();
    const { 
        currentPhase, 
        editorialPlan,
        isProcessing,
        currentGoalIndex,
        goalEdits,
        isFetchingEdits
    } = workflowState;

    const [manuscriptText, setManuscriptText] = useState("Lachesis ran her hand through her hair and focused her pacing gaze on Sylvia's hands. \"And what have you done since you came to this world?\" the Director asked. \"What has seemed to be most important to you?\"");
    const [suggestions, setSuggestions] = useState([]);
    const [activeConflictGroup, setActiveConflictGroup] = useState(null);
    const editorContainerRef = useRef(null);
    const viewRef = useRef(null);
    const sentenceLevelFetchedRef = useRef(new Set()); // Track which phases we've fetched

    // ProseMirror Initialization
    useEffect(() => {
        console.log('📝 [DEBUG] ProseMirror init effect running');
        console.log('📝 [DEBUG] editorContainerRef.current:', !!editorContainerRef.current);
        console.log('📝 [DEBUG] viewRef.current:', !!viewRef.current);
        
        if (!editorContainerRef.current || viewRef.current) {
            console.log('📝 [DEBUG] Skipping ProseMirror initialization - container missing or view exists');
            return;
        }
        
        console.log('📝 [DEBUG] Creating ProseMirror editor');
        const handleConflictClick = (conflictGroup) => { setActiveConflictGroup(conflictGroup); };
        const handleDirectAccept = (suggestionId) => { handleAcceptChoice(suggestionId); };

        const state = EditorState.create({
            doc: createDocFromText(luluSchema, manuscriptText),
            plugins: [createCoreSuggestionPlugin({ onAccept: handleDirectAccept, onConflictClick: handleConflictClick })],
        });

        const view = new EditorView(editorContainerRef.current, { state, dispatchTransaction: (tr) => {
            const newState = view.state.apply(tr);
            view.updateState(newState);
            if (tr.docChanged) {
                setManuscriptText(docToText(newState.doc));
            }
        }});

        viewRef.current = view;
        console.log('📝 [DEBUG] ProseMirror editor created successfully');
        
        return () => { 
            console.log('📝 [DEBUG] Cleaning up ProseMirror editor');
            view.destroy(); 
            viewRef.current = null; 
        };
    }, []);

    // Derived State (memoized for stability)
    const substantiveGoals = useMemo(() => {
        console.log('🔍 [DEBUG] Editorial plan structure:', editorialPlan);
        return (editorialPlan || []).filter(goal => {
            console.log('🔍 [DEBUG] Goal structure:', goal);
            return goal.type && SUBSTANTIVE_PHASES.includes(goal.type.toLowerCase());
        });
    }, [editorialPlan]);

    const currentGoal = useMemo(() =>
        (currentGoalIndex !== null && substantiveGoals[currentGoalIndex]) ? substantiveGoals[currentGoalIndex] : null,
        [substantiveGoals, currentGoalIndex]
    );

    const nextGoal = useMemo(() =>
        (currentGoalIndex !== null && substantiveGoals[currentGoalIndex + 1]) ? substantiveGoals[currentGoalIndex + 1] : null,
        [substantiveGoals, currentGoalIndex]
    );

    // Effect for State Cleanup on Phase Change
    useEffect(() => {
        if (currentPhase === 'assessment') {
            setSuggestions([]);
        }
        // Clear fetch tracking when phase changes
        sentenceLevelFetchedRef.current.clear();
        console.log('🧹 [DEBUG] Cleared sentence-level fetch tracking for phase:', currentPhase);
    }, [currentPhase]);

    // Effect for Data Fetching
    useEffect(() => {
        if (SUBSTANTIVE_PHASES.includes(currentPhase)) {
            if (currentGoal && !goalEdits[currentGoal.id]) {
                actions.fetchEditsForGoal(currentGoal, manuscriptText);
            }
            if (nextGoal && !goalEdits[nextGoal.id]) {
                actions.prefetchEditsForGoal(nextGoal, manuscriptText);
            }
        }
        
        if (SENTENCE_LEVEL_PHASES.includes(currentPhase)) {
            console.log('🎯 [DEBUG] Sentence-level phase detected:', currentPhase);
            
            // 🛡️ GUARD: Prevent duplicate fetches for the same phase
            const phaseKey = `${currentPhase}-${manuscriptText.length}`;
            if (sentenceLevelFetchedRef.current.has(phaseKey)) {
                console.log('🎯 [DEBUG] Already fetched suggestions for this phase, skipping');
                return;
            }
            
            console.log('🎯 [DEBUG] Marking phase as being fetched:', phaseKey);
            sentenceLevelFetchedRef.current.add(phaseKey);
            
            const fetchSentenceLevelEdits = async () => {
                console.log('🎯 [DEBUG] About to call fetchSuggestionsForPhase');
                try {
                    const fetchedSuggestions = await actions.fetchSuggestionsForPhase(manuscriptText);
                    console.log('🎯 [DEBUG] fetchSuggestionsForPhase returned:', fetchedSuggestions);
                    
                    // ✅ Only check if editor is available (removed problematic isMounted check)
                    if (viewRef.current) {
                        console.log('🎯 [DEBUG] Editor available, processing suggestions');
                        console.log('🎯 [DEBUG] viewRef.current.state.doc.content.size:', viewRef.current.state.doc.content.size);
                        
                        // SURGICAL FIX: Replace placeholder position mapping with correct findPositionOfText logic
                        const suggestionsWithPositions = (fetchedSuggestions || []).map(s => {
                            console.log('🎯 [DEBUG] Processing suggestion:', s);
                            const position = findPositionOfText(viewRef.current.state.doc, s.original);
                            if (position) {
                                console.log('🎯 [DEBUG] Found position for suggestion:', s.original, 'at', position);
                                return {...s, from: position.from, to: position.to};
                            } else {
                                console.warn('🎯 [DEBUG] Could not find position for suggestion:', s.original);
                                return null;
                            }
                        }).filter(Boolean); // Remove null entries where position wasn't found
                        console.log('🎯 [DEBUG] Suggestions with positions:', suggestionsWithPositions);
                        
                        console.log('🎯 [DEBUG] About to call ConflictGrouper.groupOverlaps');
                        const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithPositions);
                        console.log('🎯 [DEBUG] Grouped suggestions:', groupedSuggestions);
                        
                        console.log('🎯 [DEBUG] About to call setSuggestions');
                        setSuggestions(groupedSuggestions);
                        console.log('🎯 [DEBUG] setSuggestions completed successfully');
                    } else {
                        console.log('🎯 [DEBUG] Editor not available, cannot process suggestions');
                    }
                } catch (error) {
                    console.error('🎯 [DEBUG] ERROR in fetchSentenceLevelEdits:', error);
                }
            };
            fetchSentenceLevelEdits();
        }
    }, [currentPhase, currentGoal, nextGoal, manuscriptText, goalEdits, actions]);

    // Effect for Updating ProseMirror with Suggestions
    useEffect(() => {
        console.log('⚡ [DEBUG] ProseMirror update effect triggered, suggestions:', suggestions);
        if (!viewRef.current) {
            console.log('⚡ [DEBUG] No viewRef.current, skipping ProseMirror update');
            return;
        }
        console.log('⚡ [DEBUG] About to call pmSetSuggestions');
        try {
            pmSetSuggestions(viewRef.current, suggestions);
            console.log('⚡ [DEBUG] pmSetSuggestions completed successfully');
        } catch (error) {
            console.error('⚡ [DEBUG] ERROR in pmSetSuggestions:', error);
        }
    }, [suggestions]);

    // Action Handlers
    const handleGoalComplete = useCallback(() => { actions.advanceToNextGoal(); }, [actions]);

    const handleAcceptChoice = useCallback((suggestionId) => {
        if (!viewRef.current) return;
        pmAcceptSuggestion(viewRef.current, suggestionId);
        const newPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        setSuggestions(newPluginState ? newPluginState.suggestions : []);
        setActiveConflictGroup(null);
    }, []);

    // Render Logic
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-purple-700 mb-8">Lulu's Conscience</h1>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit">
                        <label className="font-semibold block mb-1 text-lg">Your Manuscript</label>
                        <div ref={editorContainerRef} className="border rounded min-h-[400px] p-3" />
                    </div>

                    <div className="w-full md:w-[32rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit min-w-[24rem]">
                        {currentPhase === 'assessment' && (
                            <EditorialPlanner manuscriptText={manuscriptText} />
                        )}

                        {SUBSTANTIVE_PHASES.includes(currentPhase) && (
                            <div className="my-4">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edit ({currentGoalIndex !== null ? currentGoalIndex + 1 : 1} of {substantiveGoals.length})
                                </h3>
                                {currentGoal ? (
                                    <StrategyCard
                                        key={currentGoal.id}
                                        goal={currentGoal}
                                        edits={(goalEdits[currentGoal.id]?.edits) || []}
                                        isLoading={isFetchingEdits || goalEdits[currentGoal.id]?.status === 'loading'}
                                        onComplete={handleGoalComplete}
                                    />
                                ) : (
                                    <div className="text-center p-8 bg-green-50 rounded-lg">
                                        <p className="text-lg font-semibold text-green-800">All substantive goals completed.</p>
                                        <button onClick={() => actions.completeCurrentPhase()} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                                            Proceed to Next Phase
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* --- ARCHITECT'S NOTE: This is the fully restored JSX for the sentence-level edit phases. --- */}
                        {SENTENCE_LEVEL_PHASES.includes(currentPhase) && (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 my-4">{currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edits</h3>
                                {isProcessing ? (
                                    <div className="p-4 text-center"><p className="text-lg font-semibold animate-pulse text-purple-700">Fetching Suggestions...</p></div>
                                ) : activeConflictGroup ? (
                                    <SuggestionConflictCard conflictGroup={activeConflictGroup} onAccept={handleAcceptChoice} />
                                ) : (
                                    <SpecificEditsPanel suggestions={suggestions} onAccept={handleAcceptChoice} onReject={() => {}} onRevise={() => {}} getEditMeta={getEditMeta} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default IndexV2;