"use client";
// 
// ARCHITECTURAL CHANGES - SEPARATE SUGGESTION STATE PATTERN:
// - Implemented "Separate Suggestion State" pattern to eliminate race conditions
// - Split suggestion management into substantiveSuggestions and grammarSuggestions
// - Both substantive and grammar data flows now feed into separate state arrays
// - Single useEffect combines arrays and synchronizes with ProseMirror plugin via pmSetSuggestions
// - Eliminates race conditions where grammar suggestions overwrite substantive ones
// - Ensures substantive edits are properly highlighted and clickable in the editor
// - Maintains all existing architectural patterns (Three Pillars, useRef, useMemo)
//
// STRATEGIC FIX - "SOUS-CHEF" PRE-FETCHING DISABLED:
// - Temporarily disabled pre-fetching of next goal edits to prevent Position Invalidation bug
// - Accepting edits on current StrategyCard can change document, making pre-fetched data incorrect
// - Priority: Stability over performance - data now fetched just-in-time for each card
// - This ensures data integrity and prevents errors from stale position data
//
// PREVIOUS CHANGES:
// - Simplified right-panel logic by removing complex JSX conditionals
// - Replaced complex renderMentorContent() with smart MentorWing component
// - All mentor-related state management now delegated to MentorWing
// - Maintained all existing workflow logic and protected useEffect hooks
// - Passed all necessary state and actions as props to MentorWing
// - Preserved ProseMirror initialization and suggestion handling

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

// DIAGNOSTIC: Verify imports are working correctly
console.log('📦 [IMPORT] pmSetSuggestions function type:', typeof pmSetSuggestions);
console.log('📦 [IMPORT] pmSetSuggestions function preview:', pmSetSuggestions.toString().substring(0, 200));
console.log('📦 [IMPORT] coreSuggestionPluginKey:', coreSuggestionPluginKey);
console.log('📦 [IMPORT] Plugin key type:', typeof coreSuggestionPluginKey);
import { createDocFromText, docToText, findPositionOfText, mapGrammarMatchesToSuggestions } from "../utils/prosemirrorHelpers";
import { ConflictGrouper } from '../utils/conflictGrouper';
import { generateSuggestionId } from '../utils/suggestionIdGenerator';
// UI & Helper Imports
import { getEditMeta } from '../utils/editorConfig';
import SpecificEditsPanel from '../components/SpecificEditsPanel';
import SuggestionConflictCard from '../components/SuggestionConflictCard';
import EditorialPlanner from '../components/EditorialPlanner';
import StrategyCard from '../components/StrategyCard';
import SuggestionPopover from '../components/SuggestionPopover';
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
 * SEPARATE SUGGESTION STATE ARCHITECTURE:
 * - Separate 'substantiveSuggestions' and 'grammarSuggestions' states eliminate race conditions
 * - Both substantive and grammar flows feed into dedicated state arrays
 * - Single synchronization point combines arrays and syncs with ProseMirror plugin
 * - Ensures all suggestion types are properly highlighted and interactive without conflicts
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
        isFetchingEdits,
        error
    } = workflowState;

    const [manuscriptText, setManuscriptText] = useState("Lachesis ran her hand through her hair and focused her pacing gaze on Sylvia's hands. \"And what have you done since you came to this world?\" the Director asked. \"What has seemed to be most important to you?\" She had went to the store yesterday.");
    const initialManuscriptTextRef = useRef(null);
    // TASK 1: Separate Suggestion State - Eliminate race conditions between suggestion types
    const [substantiveSuggestions, setSubstantiveSuggestions] = useState([]);
    const [grammarSuggestions, setGrammarSuggestions] = useState([]);
    const [activeConflictGroup, setActiveConflictGroup] = useState(null);
    // Focus Edit UI state centralized here
    const [isFocusEditActive, setIsFocusEditActive] = useState(false);
    const [isFocusEditProcessing, setIsFocusEditProcessing] = useState(false);
    // Red Line Grammar Check State
    const [isGrammarChecking, setIsGrammarChecking] = useState(false);
    const lastGrammarCheckTextRef = useRef(''); // Track last text that was grammar checked
    // SuggestionPopover State (Direct DOM Solution)
    const [popoverTarget, setPopoverTarget] = useState(null);
    const [activePopoverSuggestion, setActivePopoverSuggestion] = useState(null);
    const popoverCloseTimerRef = useRef(null); // Coyote Time: Delayed close timer
    const editorContainerRef = useRef(null);
    const viewRef = useRef(null);
    const sentenceLevelFetchedRef = useRef(new Set()); // Track which phases we've fetched

    // DIAGNOSTIC FUNCTIONS
    const testDirectPluginCall = () => {
        if (!viewRef.current) {
            console.log('🧪 [TEST] ViewRef not available, skipping direct test');
            return;
        }
        
        const testSuggestion = [{
            id: 'test_direct_123',
            type: 'passive',
            from: 1,
            to: 5,
            original: 'test',
            replacement: 'TEST',
            editType: 'grammar',
            suggestion: 'TEST'
        }];
        
        console.log('🧪 [TEST] Calling setSuggestions directly with test data');
        console.log('🧪 [TEST] Test suggestion:', testSuggestion[0]);
        pmSetSuggestions(viewRef.current, testSuggestion);
    };

    const checkPluginState = () => {
        if (!viewRef.current) {
            console.log('🔍 [STATE CHECK] ViewRef not available');
            return;
        }
        
        try {
            const pluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
            console.log('🔍 [STATE CHECK] Plugin state exists:', !!pluginState);
            console.log('🔍 [STATE CHECK] Plugin state:', pluginState);
            console.log('🔍 [STATE CHECK] Suggestions in plugin:', pluginState?.suggestions?.length || 0);
            console.log('🔍 [STATE CHECK] Decorations in plugin:', pluginState?.decorations?.find || 'no decorations');
        } catch (error) {
            console.error('🔍 [STATE CHECK] Error accessing plugin state:', error);
        }
    };

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
        // Capture the initial manuscript text for Editorial Report
        initialManuscriptTextRef.current = manuscriptText;
        console.log('📝 [DEBUG] ProseMirror editor created successfully');
        
        // DIAGNOSTIC: Test direct plugin communication after initialization
        setTimeout(() => {
            testDirectPluginCall();
            checkPluginState();
        }, 1000);
        
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

    // Effect for State Cleanup on Phase Change (UPDATED for Separate Suggestion State)
    useEffect(() => {
        if (currentPhase === 'assessment') {
            setSubstantiveSuggestions([]);
            setGrammarSuggestions([]);
        }
        // Clear fetch tracking when phase changes
        sentenceLevelFetchedRef.current.clear();
        console.log('🧹 [DEBUG] Cleared sentence-level fetch tracking for phase:', currentPhase);
    }, [currentPhase]);

    // Effect for Data Fetching (TASK 2 FIX: Added position mapping for goal edits)
    useEffect(() => {
        if (SUBSTANTIVE_PHASES.includes(currentPhase)) {
            if (currentGoal && !goalEdits[currentGoal.id]) {
                actions.fetchEditsForGoal(currentGoal, manuscriptText);
            }
            // SOUS-CHEF PRE-FETCHING DISABLED: Removed nextGoal pre-fetching to prevent Position Invalidation bug
            // When edits are accepted on current goal, document positions change, making pre-fetched data incorrect
            // Data will now be fetched just-in-time when each goal becomes current
        }
        
        // TASK 3: Upgraded Sentence-Level Edit Data Flow
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
                        
                        //============== START: CORRECTED CODE BLOCK ==============
                        // SURGICAL FIX: Map suggestions to ensure they have positions and a canonical ID
                        const suggestionsWithPositions = (fetchedSuggestions || []).map(s => {
                          const position = findPositionOfText(viewRef.current.state.doc, s.original);
                          if (position) {
                            // 🔧 CRITICAL FIX: Generate canonical ID for every suggestion
                            const canonicalId = generateSuggestionId(
                              s.original,
                              s.suggestion || s.replacement || '',
                              { editType: s.editType || currentPhase || 'line' }
                            );

                            const suggestion = { ...s, id: canonicalId, from: position.from, to: position.to };

                            // 🛡️ DEFENSIVE GUARD: Ensure the fix worked
                            if (!suggestion.id) {
                              console.error('DEFENSIVE GUARD FAILED: A suggestion was just processed without an ID!', suggestion);
                            }
                            return suggestion;
                          } else {
                            console.warn('🎯 [DEBUG] Could not find position for suggestion:', s.original);
                            return null;
                          }
                        }).filter(Boolean); // Remove null entries where position wasn't found
                        //============== END: CORRECTED CODE BLOCK ==============
                        console.log('🎯 [DEBUG] Suggestions with positions:', suggestionsWithPositions);
                        
                        console.log('🎯 [DEBUG] About to call ConflictGrouper.groupOverlaps');
                        const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithPositions);
                        console.log('🎯 [DEBUG] Grouped suggestions:', groupedSuggestions);
                        
                        // SEPARATE SUGGESTION STATE: Update substantive suggestions for sentence-level edits
                        console.log('🎯 [DEBUG] About to call setSubstantiveSuggestions (sentence-level)');
                        setSubstantiveSuggestions(groupedSuggestions);
                        console.log('🎯 [DEBUG] setSubstantiveSuggestions completed successfully (sentence-level)');
                    } else {
                        console.log('🎯 [DEBUG] Editor not available, cannot process suggestions');
                    }
                } catch (error) {
                    console.error('🎯 [DEBUG] ERROR in fetchSentenceLevelEdits:', error);
                }
            };
            fetchSentenceLevelEdits();
        }
    }, [currentPhase, currentGoal, manuscriptText, goalEdits, actions]);

    // TASK 2: Upgraded Substantive Edit Data Flow - Now feeds into Unified Suggestion State
    useEffect(() => {
        if (!viewRef.current || !currentGoal || !goalEdits[currentGoal.id]) {
            return;
        }

        const goalEditData = goalEdits[currentGoal.id];
        if (goalEditData.status === 'loaded' && goalEditData.edits && !goalEditData.positionsMapped) {
            console.log('🎯 [DEBUG] Adding position mapping to goal edits for:', currentGoal.id);
            
            const editsWithPositions = goalEditData.edits.map(edit => {
                if (!edit.original) return edit;
                
                const position = findPositionOfText(viewRef.current.state.doc, edit.original);
                if (position) {
                    console.log('🎯 [DEBUG] Found position for goal edit:', edit.original, 'at', position);
                    
                    // CANONICAL ID FIX: Generate canonical ID that matches plugin
                    const canonicalId = generateSuggestionId(
                        edit.original,
                        edit.suggestion || edit.replacement || '',
                        { editType: edit.editType || 'substantive' }
                    );
                    console.log('🎯 [DEBUG] Generated canonical ID for edit:', canonicalId);
                    
                    return {
                        ...edit,
                        id: canonicalId, // ✅ Add canonical ID
                        from: position.from,
                        to: position.to
                    };
                } else {
                    console.warn('🎯 [DEBUG] Could not find position for goal edit:', edit.original);
                    return edit;
                }
            });

            // Update the goalEdits in the context with positioned edits
            actions.updateGoalEditsWithPositions(currentGoal.id, editsWithPositions);

            // UNIFIED SUGGESTION STATE: Add substantive edits to master list
            const editsWithValidPositions = editsWithPositions.filter(edit => 
                edit.from !== undefined && edit.to !== undefined
            );
            
            if (editsWithValidPositions.length > 0) {
                console.log('🎯 [DEBUG] Processing substantive edits for conflict grouping:', editsWithValidPositions);
                
                // Group substantive edits for conflicts (same as sentence-level edits)
                const groupedSubstantiveEdits = ConflictGrouper.groupOverlaps(editsWithValidPositions);
                console.log('🎯 [DEBUG] Grouped substantive edits:', groupedSubstantiveEdits);
                
                // SEPARATE SUGGESTION STATE: Update substantive suggestions only
                console.log('🎯 [DEBUG] About to call setSubstantiveSuggestions (substantive)');
                setSubstantiveSuggestions(groupedSubstantiveEdits);
                console.log('🎯 [DEBUG] setSubstantiveSuggestions completed successfully (substantive)');
            }
        }
    }, [currentGoal, goalEdits, actions]);

    // TASK 1: Combined Synchronization Point - Unified suggestion arrays with ProseMirror
    useEffect(() => {
        if (!viewRef.current) return;
        const unified = [...substantiveSuggestions, ...grammarSuggestions];
        console.log('⚡ [UNIFIED] ProseMirror sync effect triggered, unified suggestions:', unified.length);
        console.log('⚡ [UNIFIED] - Substantive suggestions:', substantiveSuggestions.length);
        console.log('⚡ [UNIFIED] - Grammar suggestions:', grammarSuggestions.length);
        try {
            pmSetSuggestions(viewRef.current, unified);
            console.log('⚡ [UNIFIED] pmSetSuggestions completed successfully with unified state');
            
            // DIAGNOSTIC: Check plugin state after each pmSetSuggestions call
            setTimeout(() => {
                console.log('🔍 [UNIFIED CHECK] Checking plugin state after pmSetSuggestions...');
                checkPluginState();
            }, 100);
        } catch (error) {
            console.error('⚡ [UNIFIED] ERROR in pmSetSuggestions:', error);
        }
    }, [substantiveSuggestions, grammarSuggestions]);

    // Red Line Grammar Check Integration - Passive Awareness System
    useEffect(() => {
        // TASK 2: Skip grammar checks during substantive or focus-edit phases
        if (SUBSTANTIVE_PHASES.includes(currentPhase) || isFocusEditActive) {
            console.log('🔴 [RED LINE] Skipping grammar check - in substantive phase or focus edit mode');
            return;
        }

        const checkGrammar = async () => {
            if (!manuscriptText.trim() || isGrammarChecking) return;
            
            setIsGrammarChecking(true);
            try {
                console.log('🔴 [RED LINE] Starting grammar check for text:', manuscriptText.substring(0, 50) + '...');
                console.log('🔴 [RED LINE] Current grammar suggestions length:', grammarSuggestions.length);
                
                const response = await fetch('/api/grammar-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: manuscriptText })
                });
                
                if (!response.ok) throw new Error(`Grammar check failed: ${response.status}`);
                
                const { results } = await response.json();
                console.log('🔴 [RED LINE] Grammar check results:', results);
                
                // ✅ CLEAN REFACTORED CALL: Use proven utility function
                if (!viewRef.current) {
                    console.warn('🔴 [RED LINE] No editor view available');
                    return;
                }

                const newGrammarSuggestions = mapGrammarMatchesToSuggestions(results, viewRef.current.state.doc);
                
                console.log('🔴 [RED LINE] Transformed suggestions:', newGrammarSuggestions);
                console.log('🔴 [RED LINE] First suggestion details:', newGrammarSuggestions[0]);
                
                // Smart suggestion diffing - only update what actually changed
                setGrammarSuggestions(prevGrammarSuggestions => {
                    // Compare new suggestions with existing ones
                    const suggestionsToKeep = prevGrammarSuggestions.filter(existing => {
                        // Keep existing suggestion if it still matches the new results
                        return newGrammarSuggestions.some(newSug => 
                            newSug.from === existing.from && 
                            newSug.to === existing.to &&
                            newSug.original === existing.original
                        );
                    });
                    
                    const suggestionsToAdd = newGrammarSuggestions.filter(newSug => {
                        // Add new suggestion if it doesn't already exist
                        return !prevGrammarSuggestions.some(existing =>
                            existing.from === newSug.from && 
                            existing.to === newSug.to &&
                            existing.original === newSug.original
                        );
                    });
                    
                    const finalGrammarSuggestions = [...suggestionsToKeep, ...suggestionsToAdd];
                    
                    console.log('🔴 [RED LINE] Smart diff results:');
                    console.log('🔴 [RED LINE] - Previous grammar suggestions:', prevGrammarSuggestions.length);
                    console.log('🔴 [RED LINE] - Suggestions to keep:', suggestionsToKeep.length);
                    console.log('🔴 [RED LINE] - New suggestions to add:', suggestionsToAdd.length);
                    console.log('🔴 [RED LINE] - Final grammar suggestion count:', finalGrammarSuggestions.length);
                    
                    return finalGrammarSuggestions;
                });
                
                // Update the last grammar check text
                lastGrammarCheckTextRef.current = manuscriptText;
                
            } catch (error) {
                console.error('🔴 [RED LINE] Grammar check error:', error);
            } finally {
                setIsGrammarChecking(false);
            }
        };

        // Smart suggestion management - only check if significant text change
        const textChanged = lastGrammarCheckTextRef.current !== manuscriptText;
        const hasPassiveSuggestions = grammarSuggestions.some(s => s.type === 'passive');
        
        // Skip if text unchanged and we have recent suggestions
        if (hasPassiveSuggestions && !textChanged) {
            console.log('🔴 [RED LINE] Skipping grammar check - text unchanged and passive suggestions exist');
            return;
        }
        
        // For text changes, we'll do smart diffing after getting new results
        // No aggressive clearing here - let the results determine what to update
        console.log('🔴 [RED LINE] Text changed, will update suggestions intelligently');

        // Debounce grammar checking - wait 2 seconds after text changes
        const timeoutId = setTimeout(checkGrammar, 2000);
        return () => clearTimeout(timeoutId);
    }, [manuscriptText, isGrammarChecking, currentPhase, isFocusEditActive]);

    // Action Handlers (TASK 3: Fix workflow progression)
    const handleGoalComplete = useCallback(() => {
        // TASK 3: If no nextGoal, complete the phase
        if (!nextGoal) {
            console.log('🎯 [WORKFLOW] No next goal, completing current phase');
            actions.completeCurrentPhase();
        } else {
            console.log('🎯 [WORKFLOW] Advancing to next goal:', nextGoal.id);
            actions.advanceToNextGoal();
        }
    }, [actions, nextGoal]);

    const handleAcceptChoice = useCallback((suggestionId) => {
        if (!viewRef.current) return;
        
        // GUARD: Check if suggestion still exists in plugin state (prevents double-processing)
        const currentPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        if (!currentPluginState) return;
        
        // Check if suggestion exists (handles both direct suggestions and conflict groups)
        const suggestionExists = currentPluginState.suggestions.some(s => {
            if (s.isConflictGroup) {
                return s.suggestions.some(child => child.id === suggestionId);
            }
            return s.id === suggestionId;
        });
        
        if (!suggestionExists) {
            // Suggestion already processed - ignore duplicate request
            return;
        }
        
        // 🚨 CRITICAL FIX: Immediately clear popover state to prevent ghost flash
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        setPopoverTarget(null);
        setActivePopoverSuggestion(null);
        
        // Process the suggestion
        pmAcceptSuggestion(viewRef.current, suggestionId);
        
        // TASK 4: Remap positions after acceptance for current goal edits
        if (currentGoal && goalEdits[currentGoal.id]) {
            const goalEditData = goalEdits[currentGoal.id];
            if (goalEditData.status === 'loaded' && goalEditData.edits) {
                // Get remaining edits (excluding the accepted one)
                const remainingEdits = goalEditData.edits.filter(edit => {
                    const editId = generateSuggestionId(
                        edit.original,
                        edit.suggestion || edit.replacement || '',
                        { editType: edit.editType || 'substantive' }
                    );
                    return editId !== suggestionId;
                });
                
                // Re-map positions for remaining edits
                const remappedEdits = remainingEdits.map(edit => {
                    if (!edit.original) return edit;
                    
                    const position = findPositionOfText(viewRef.current.state.doc, edit.original);
                    if (position) {
                        console.log('🎯 [REMAP] Re-mapped position for edit:', edit.original, 'at', position);
                        return {
                            ...edit,
                            from: position.from,
                            to: position.to
                        };
                    } else {
                        console.warn('🎯 [REMAP] Could not re-map position for edit:', edit.original);
                        return edit;
                    }
                });
                
                // Update goal edits with new positions
                actions.updateGoalEditsWithPositions(currentGoal.id, remappedEdits);
                console.log('🎯 [REMAP] Updated goal edits with remapped positions');
            }
        }
        
        // SEPARATE SUGGESTION STATE: Update suggestion arrays after acceptance
        const newPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        const newSuggestions = newPluginState ? newPluginState.suggestions : [];
        
        // Separate suggestions by type
        const newSubstantiveSuggestions = newSuggestions.filter(s => s.type !== 'passive');
        const newGrammarSuggestions = newSuggestions.filter(s => s.type === 'passive');
        
        setSubstantiveSuggestions(newSubstantiveSuggestions);
        setGrammarSuggestions(newGrammarSuggestions);
        setActiveConflictGroup(null);
    }, [currentGoal, goalEdits, actions]);

    // Soft reject: remove suggestion from plugin and unified state without applying
    const handleRejectChoice = useCallback((suggestionId) => {
        if (!viewRef.current) return;

        const currentPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        if (!currentPluginState) return;

        // Remove the target suggestion id from both flat and conflict groups
        const prune = (list) => {
            const result = [];
            for (const s of list) {
                if (s.isConflictGroup && Array.isArray(s.suggestions)) {
                    const prunedChildren = s.suggestions.filter(child => child.id !== suggestionId);
                    if (prunedChildren.length > 1) {
                        result.push({ ...s, suggestions: prunedChildren });
                    } else if (prunedChildren.length === 1) {
                        result.push(prunedChildren[0]);
                    }
                } else if (s.id !== suggestionId) {
                    result.push(s);
                }
            }
            return result;
        };

        const newSuggestions = prune(currentPluginState.suggestions || []);
        try {
            pmSetSuggestions(viewRef.current, newSuggestions);
            setActiveSuggestions(newSuggestions);
        } catch (e) {
            console.error('Reject failed to update suggestions:', e);
        }
    }, []);

    // SuggestionPopover Event Handlers (Coyote Time Implementation)
    const handleSuggestionMouseEnter = useCallback((suggestionId, event) => {
        // Coyote Time: Cancel any pending close action before showing popover
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        
        const allSuggestions = [...substantiveSuggestions, ...grammarSuggestions];
        const suggestion = allSuggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            setPopoverTarget(event.target);
            setActivePopoverSuggestion(suggestion);
        }
    }, [substantiveSuggestions, grammarSuggestions]);

    const handleSuggestionMouseLeave = useCallback(() => {
        // Coyote Time: Schedule delayed close with 300ms grace period
        popoverCloseTimerRef.current = setTimeout(() => {
            setPopoverTarget(null);
            setActivePopoverSuggestion(null);
            popoverCloseTimerRef.current = null;
        }, 300);
    }, []);

    // Add placeholder handlers for the popover's own buttons
    const handlePopoverAccept = useCallback((suggestionId) => handleAcceptChoice(suggestionId), [handleAcceptChoice]);
    const handlePopoverLearnMore = useCallback((suggestion) => console.log("Learn More:", suggestion), []);
    const handlePopoverIgnore = useCallback((suggestion) => console.log("Ignore:", suggestion), []);
    const handlePopoverClose = useCallback(() => handleSuggestionMouseLeave(), [handleSuggestionMouseLeave]);
    // Editorial Report MVP callback
    const handleApplyWithLulu = useCallback((goal) => {
        console.log(`// TODO: Initiate Deep Dive with goal: ${goal}`);
    }, []);

    // Coyote Time: Popover mouse event handlers for "safe zone" behavior
    const handlePopoverMouseEnter = useCallback(() => {
        // Cancel any pending close action when mouse enters popover
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
    }, []);

    const handlePopoverMouseLeave = useCallback(() => {
        // Start new close timer when mouse leaves popover
        handleSuggestionMouseLeave();
    }, [handleSuggestionMouseLeave]);

    // Direct DOM Solution: Bypass ProseMirror event system
    useEffect(() => {
        const editorContainer = editorContainerRef.current;
        if (!editorContainer) return;

        const handleMouseEnter = (event) => {
            const target = event.target;
            if (target.classList.contains('suggestion-highlight') && target.classList.contains('passive')) {
                const suggestionId = target.getAttribute('data-suggestion-id');
                if (suggestionId) {
                    handleSuggestionMouseEnter(suggestionId, event);
                }
            }
        };

        const handleMouseLeave = (event) => {
            const target = event.target;
            if (target.classList.contains('suggestion-highlight') && target.classList.contains('passive')) {
                handleSuggestionMouseLeave();
            }
        };

        editorContainer.addEventListener('mouseenter', handleMouseEnter, true);
        editorContainer.addEventListener('mouseleave', handleMouseLeave, true);

        return () => {
            editorContainer.removeEventListener('mouseenter', handleMouseEnter, true);
            editorContainer.removeEventListener('mouseleave', handleMouseLeave, true);
        };
    }, [handleSuggestionMouseEnter, handleSuggestionMouseLeave]);

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
                    spellCheck="false"
                    style={{ 
                        minHeight: '500px',
                        height: 'calc(100vh - 200px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                />
            </div>
        </div>
    );



    // Focus Edit: centralized action to fetch and canonicalize suggestions
    const startFocusEdit = useCallback(async () => {
        if (!viewRef.current) return;
        setIsFocusEditActive(true);
        setIsFocusEditProcessing(true);
        try {
            const response = await fetch('/api/focus-edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: manuscriptText }),
            });
            if (!response.ok) throw new Error(`Focus Edit API request failed: ${response.status}`);
            const apiResult = await response.json();
            const fetched = apiResult?.suggestions || [];

            // Map positions and canonical IDs exactly like sentence-level flow
            const positioned = (fetched || []).map(s => {
                const position = findPositionOfText(viewRef.current.state.doc, s.original);
                if (!position) return null;
                const canonicalId = generateSuggestionId(
                    s.original,
                    s.suggestion || s.replacement || '',
                    { editType: s.editType || currentPhase || 'line' }
                );
                const suggestion = { ...s, id: canonicalId, from: position.from, to: position.to };
                if (!suggestion.id) {
                    console.error('DEFENSIVE GUARD FAILED: A suggestion was just processed without an ID!', suggestion);
                }
                return suggestion;
            }).filter(Boolean);

            const grouped = ConflictGrouper.groupOverlaps(positioned);
            setActiveSuggestions(grouped);
        } catch (err) {
            console.error('Focus Edit request failed:', err);
        } finally {
            setIsFocusEditProcessing(false);
        }
    }, [manuscriptText, currentPhase]);

    const handleConsultationSelect = useCallback((consultationType) => {
        if (consultationType === 'focusEdit') {
            startFocusEdit();
            return;
        }
        // Other types handled inside MentorWing (UI-only)
    }, [startFocusEdit]);

    const handleResetFocusEdit = useCallback(() => {
        setIsFocusEditActive(false);
        setIsFocusEditProcessing(false);
        // Do not clear activeSuggestions here; caller controls when to clear
    }, []);

    // Main Render - Sophisticated Writer's Desk Layout with Smart MentorWing
    return (
        <>
            <WriterDesk
                museWing={<MuseWing />}
                manuscript={renderManuscript()}
                mentorWing={
                    <MentorWing 
                        manuscriptText={manuscriptText}
                        actions={actions}
                        currentPhase={currentPhase}
                        isProcessing={isProcessing}
                        // TASK 5: Pass Combined Suggestion State to MentorWing
                        suggestions={[...substantiveSuggestions, ...grammarSuggestions]}
                        activeConflictGroup={activeConflictGroup}
                        onAcceptChoice={handleAcceptChoice}
                        onRejectChoice={() => {}}
                        getEditMeta={getEditMeta}
                        // Additional props for substantive phases
                        currentGoal={currentGoal}
                        goalEdits={goalEdits}
                        isFetchingEdits={isFetchingEdits}
                        currentGoalIndex={currentGoalIndex}
                        substantiveGoals={substantiveGoals}
                        onGoalComplete={handleGoalComplete}
                        // Additional props for EditorialPlanner
                        editorialPlan={editorialPlan}
                        error={error}
                        // Focus Edit control props
                        isFocusEditActive={isFocusEditActive}
                        isFocusEditProcessing={isFocusEditProcessing}
                        onConsultationSelect={handleConsultationSelect}
                        onResetFocusEdit={handleResetFocusEdit}
                        // Editorial Report props
                        initialManuscriptText={initialManuscriptTextRef.current}
                        onApplyWithLulu={handleApplyWithLulu}
                    />
                }
            />
            {/* SuggestionPopover - Rendered outside WriterDesk to avoid layout conflicts */}
            {activePopoverSuggestion && popoverTarget && (
                <SuggestionPopover
                    suggestion={activePopoverSuggestion}
                    targetElement={popoverTarget}
                    onAccept={handlePopoverAccept}
                    onLearnMore={handlePopoverLearnMore}
                    onIgnore={handlePopoverIgnore}
                    onClose={handlePopoverClose}
                    onPopoverEnter={handlePopoverMouseEnter}
                    onPopoverLeave={handlePopoverMouseLeave}
                />
            )}
        </>
    );
}

export default IndexV2;