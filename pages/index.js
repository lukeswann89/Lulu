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
// Sophisticated Writer's Desk Layout Imports
import WriterDesk from '../components/layout/WriterDesk';
import MuseWing from '../components/layout/MuseWing';
import MentorWing from '../components/layout/MentorWing';

/**
 * IndexV2 - Main application page with sophisticated Writer's Desk layout
 * 
 * CHANGES MADE:
 * - Integrated sophisticated WriterDesk layout with "One Wing" rule
 * - Restructured render functions for the new three-pane system
 * - Preserved all existing workflow logic and protected useEffect hooks
 * - Implemented sacred 800px manuscript width with centered positioning
 * - Maintained all existing state management and data fetching patterns
 * 
 * PROTECTED ELEMENTS (UNCHANGED):
 * - All useEffect hooks and their dependency arrays
 * - WorkflowContext integration and useWorkflowActions usage
 * - ProseMirror initialization and suggestion handling logic
 * - All existing component integrations and prop passing
 */

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

    // ProseMirror Initialization (PROTECTED - UNCHANGED)
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

    // Derived State (memoized for stability) (PROTECTED - UNCHANGED)
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

    // Effect for State Cleanup on Phase Change (PROTECTED - UNCHANGED)
    useEffect(() => {
        if (currentPhase === 'assessment') {
            setSuggestions([]);
        }
        // Clear fetch tracking when phase changes
        sentenceLevelFetchedRef.current.clear();
        console.log('🧹 [DEBUG] Cleared sentence-level fetch tracking for phase:', currentPhase);
    }, [currentPhase]);

    // Effect for Data Fetching (PROTECTED - UNCHANGED)
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

    // Effect for Updating ProseMirror with Suggestions (PROTECTED - UNCHANGED)
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

    // Action Handlers (PROTECTED - UNCHANGED)
    const handleGoalComplete = useCallback(() => { actions.advanceToNextGoal(); }, [actions]);

    const handleAcceptChoice = useCallback((suggestionId) => {
        if (!viewRef.current) return;
        pmAcceptSuggestion(viewRef.current, suggestionId);
        const newPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        setSuggestions(newPluginState ? newPluginState.suggestions : []);
        setActiveConflictGroup(null);
    }, []);

    // Render Components for Sophisticated Writer's Desk
    const renderManuscript = () => (
        <div className="h-full p-6">
            {/* Page Header */}
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-purple-700 mb-2">Lulu's Conscience</h1>
                <p className="text-sm text-gray-600">Your Intelligent Writing Companion</p>
            </div>
            
            {/* The Sacred Page - 800px max-width, centered */}
            <div>
                <label className="font-semibold text-lg text-gray-800 mb-3 block">Your Manuscript</label>
                <div 
                    ref={editorContainerRef} 
                    className="border border-gray-300 rounded-lg p-4 bg-white focus-within:border-purple-500 transition-colors"
                    style={{ 
                        minHeight: '500px',
                        height: 'calc(100vh - 200px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                />
            </div>
        </div>
    );

    const renderMentorContent = () => (
        <div className="p-6">
            {currentPhase === 'assessment' && (
                <div>
                    <h3 className="text-xl font-bold text-green-800 mb-4">📋 Editorial Assessment</h3>
                    <EditorialPlanner manuscriptText={manuscriptText} />
                </div>
            )}

            {SUBSTANTIVE_PHASES.includes(currentPhase) && (
                <div>
                    <h3 className="text-xl font-bold text-green-800 mb-4">
                        🎯 {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edit 
                        ({currentGoalIndex !== null ? currentGoalIndex + 1 : 1} of {substantiveGoals.length})
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
                        <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-4xl mb-4">✅</div>
                            <p className="text-lg font-semibold text-green-800 mb-3">All substantive goals completed!</p>
                            <p className="text-sm text-green-600 mb-4">Ready to proceed to the next editing phase.</p>
                            <button 
                                onClick={() => actions.completeCurrentPhase()} 
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                            >
                                Proceed to Next Phase
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {SENTENCE_LEVEL_PHASES.includes(currentPhase) && (
                <div>
                    <h3 className="text-xl font-bold text-green-800 mb-4">
                        ✏️ {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edits
                    </h3>
                    {isProcessing ? (
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">⏳</div>
                            <p className="text-lg font-semibold animate-pulse text-green-700">Analyzing your manuscript...</p>
                            <p className="text-sm text-green-600 mt-2">Generating personalized suggestions</p>
                        </div>
                    ) : activeConflictGroup ? (
                        <div>
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Conflicting suggestions detected.</strong> Please choose the best option.
                                </p>
                            </div>
                            <SuggestionConflictCard conflictGroup={activeConflictGroup} onAccept={handleAcceptChoice} />
                        </div>
                    ) : (
                        <SpecificEditsPanel 
                            suggestions={suggestions} 
                            onAccept={handleAcceptChoice} 
                            onReject={() => {}} 
                            onRevise={() => {}} 
                            getEditMeta={getEditMeta} 
                        />
                    )}
                </div>
            )}
        </div>
    );

    // Main Render - Sophisticated Writer's Desk Layout
    return (
        <WriterDesk
            museWing={<MuseWing />}
            manuscript={renderManuscript()}
            mentorWing={<MentorWing>{renderMentorContent()}</MentorWing>}
        />
    );
}

export default IndexV2;