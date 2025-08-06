"use client";
// 
// ARCHITECTURAL CHANGES - UNIFIED SUGGESTION STATE PATTERN:
// - Implemented "Unified Suggestion State" pattern to fix ProseMirror integration bug
// - Renamed 'suggestions' to 'activeSuggestions' as single source of truth for editor state
// - Both substantive and sentence-level data flows now feed into the same master suggestion list
// - Single useEffect synchronizes activeSuggestions with ProseMirror plugin via pmSetSuggestions
// - Eliminates state conflicts between different suggestion sources
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
 * UNIFIED SUGGESTION STATE ARCHITECTURE:
 * - Single 'activeSuggestions' state as master list for all editor suggestions
 * - Both substantive and sentence-level flows feed into this unified state
 * - Single synchronization point with ProseMirror plugin eliminates state conflicts
 * - Ensures all suggestion types are properly highlighted and interactive
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
    // TASK 1: Unified Suggestion State - Single source of truth for all editor suggestions
    const [activeSuggestions, setActiveSuggestions] = useState([]);
    const [activeConflictGroup, setActiveConflictGroup] = useState(null);
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

    // Effect for State Cleanup on Phase Change (UPDATED for Unified Suggestion State)
    useEffect(() => {
        if (currentPhase === 'assessment') {
            setActiveSuggestions([]);
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
                        
                        // UNIFIED SUGGESTION STATE: Update master list instead of calling pmSetSuggestions directly
                        console.log('🎯 [DEBUG] About to call setActiveSuggestions (sentence-level)');
                        setActiveSuggestions(groupedSuggestions);
                        console.log('🎯 [DEBUG] setActiveSuggestions completed successfully (sentence-level)');
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
                
                // UNIFIED SUGGESTION STATE: Update master list with substantive edits
                console.log('🎯 [DEBUG] About to call setActiveSuggestions (substantive)');
                setActiveSuggestions(groupedSubstantiveEdits);
                console.log('🎯 [DEBUG] setActiveSuggestions completed successfully (substantive)');
            }
        }
    }, [currentGoal, goalEdits, actions]);

    // TASK 4: Single Synchronization Point - Unified Suggestion State with ProseMirror
    useEffect(() => {
        console.log('⚡ [UNIFIED] ProseMirror sync effect triggered, activeSuggestions:', activeSuggestions);
        if (!viewRef.current) {
            console.log('⚡ [UNIFIED] No viewRef.current, skipping ProseMirror sync');
            return;
        }
        console.log('⚡ [UNIFIED] About to call pmSetSuggestions with unified state');
        try {
            pmSetSuggestions(viewRef.current, activeSuggestions);
            console.log('⚡ [UNIFIED] pmSetSuggestions completed successfully with unified state');
            
            // DIAGNOSTIC: Check plugin state after each pmSetSuggestions call
            setTimeout(() => {
                console.log('🔍 [UNIFIED CHECK] Checking plugin state after pmSetSuggestions...');
                checkPluginState();
            }, 100);
        } catch (error) {
            console.error('⚡ [UNIFIED] ERROR in pmSetSuggestions:', error);
        }
    }, [activeSuggestions]);

    // Red Line Grammar Check Integration - Passive Awareness System
    useEffect(() => {
        const checkGrammar = async () => {
            if (!manuscriptText.trim() || isGrammarChecking) return;
            
            setIsGrammarChecking(true);
            try {
                console.log('🔴 [RED LINE] Starting grammar check for text:', manuscriptText.substring(0, 50) + '...');
                console.log('🔴 [RED LINE] Current activeSuggestions length:', activeSuggestions.length);
                
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

                const grammarSuggestions = mapGrammarMatchesToSuggestions(results, viewRef.current.state.doc);
                
                console.log('🔴 [RED LINE] Transformed suggestions:', grammarSuggestions);
                console.log('🔴 [RED LINE] First suggestion details:', grammarSuggestions[0]);
                
                // Smart suggestion diffing - only update what actually changed
                setActiveSuggestions(prevSuggestions => {
                    const nonGrammarSuggestions = prevSuggestions.filter(s => s.type !== 'passive');
                    const existingPassiveSuggestions = prevSuggestions.filter(s => s.type === 'passive');
                    
                    // Compare new suggestions with existing ones
                    const suggestionsToKeep = existingPassiveSuggestions.filter(existing => {
                        // Keep existing suggestion if it still matches the new results
                        return grammarSuggestions.some(newSug => 
                            newSug.from === existing.from && 
                            newSug.to === existing.to &&
                            newSug.original === existing.original
                        );
                    });
                    
                    const suggestionsToAdd = grammarSuggestions.filter(newSug => {
                        // Add new suggestion if it doesn't already exist
                        return !existingPassiveSuggestions.some(existing =>
                            existing.from === newSug.from && 
                            existing.to === newSug.to &&
                            existing.original === newSug.original
                        );
                    });
                    
                    const finalSuggestions = [...nonGrammarSuggestions, ...suggestionsToKeep, ...suggestionsToAdd];
                    
                    console.log('🔴 [RED LINE] Smart diff results:');
                    console.log('🔴 [RED LINE] - Existing passive suggestions:', existingPassiveSuggestions.length);
                    console.log('🔴 [RED LINE] - Suggestions to keep:', suggestionsToKeep.length);
                    console.log('🔴 [RED LINE] - New suggestions to add:', suggestionsToAdd.length);
                    console.log('🔴 [RED LINE] - Final suggestion count:', finalSuggestions.length);
                    
                    return finalSuggestions;
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
        const hasPassiveSuggestions = activeSuggestions.some(s => s.type === 'passive');
        
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
    }, [manuscriptText, isGrammarChecking]); // Remove activeSuggestions.length dependency

    // Action Handlers (TASK 5: Updated to use Unified Suggestion State)
    const handleGoalComplete = useCallback(() => { actions.advanceToNextGoal(); }, [actions]);

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
        
        // UNIFIED SUGGESTION STATE: Update master list after acceptance
        const newPluginState = coreSuggestionPluginKey.getState(viewRef.current.state);
        const newSuggestions = newPluginState ? newPluginState.suggestions : [];
        setActiveSuggestions(newSuggestions);
        setActiveConflictGroup(null);
    }, []);

    // SuggestionPopover Event Handlers (Coyote Time Implementation)
    const handleSuggestionMouseEnter = useCallback((suggestionId, event) => {
        // Coyote Time: Cancel any pending close action before showing popover
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        
        const suggestion = activeSuggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            setPopoverTarget(event.target);
            setActivePopoverSuggestion(suggestion);
        }
    }, [activeSuggestions]);

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
                        // TASK 5: Pass Unified Suggestion State to MentorWing
                        suggestions={activeSuggestions}
                        activeConflictGroup={activeConflictGroup}
                        onAcceptChoice={handleAcceptChoice}
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