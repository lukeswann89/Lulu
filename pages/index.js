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
import toast, { Toaster } from 'react-hot-toast';
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

const SUBSTANTIVE_PHASES = ["substantive", "developmental", "structural"];
const GRAMMAR_HOTFIX_STRICT = process.env.NEXT_PUBLIC_LULU_GRAMMAR_HOTFIX_STRICT === "1";
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
    
    // Step 1: Master "Mode" State - Controls system-wide editing mode
    const [editMode, setEditMode] = useState('passive');
    
    // TASK 1: Separate Suggestion State - Fix race conditions between substantive and grammar suggestions
    const [substantiveSuggestions, setSubstantiveSuggestions] = useState([]);
    const [grammarSuggestions, setGrammarSuggestions] = useState([]);

    // ADD: Stable callback ref for plugin
    const handleAcceptChoiceRef = useRef();

    // Combined suggestions for ProseMirror synchronization
    const activeSuggestions = useMemo(() => {
        return [...substantiveSuggestions, ...grammarSuggestions];
    }, [substantiveSuggestions, grammarSuggestions]);
    // ADD: Keep the ref updated on every render
    useEffect(() => {
        handleAcceptChoiceRef.current = handleAcceptChoice;
    }); // No dependency array ensures this runs on every render
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
    const sentenceLevelFetchedRef = useRef(new Set());

    // ProseMirror Editor Initialization
    useEffect(() => {
        // Initialize ProseMirror here
        const doc = createDocFromText(manuscriptText, luluSchema);
        const plugins = [
            createCoreSuggestionPlugin({
                onAccept: (suggestionId) => {
                    if (handleAcceptChoiceRef.current) {
                        handleAcceptChoiceRef.current(suggestionId);
                    }
                }
            })
        ];

        const state = EditorState.create({
            doc,
            schema: luluSchema,
            plugins
        });

        const view = new EditorView(editorContainerRef.current, {
            state,
            dispatchTransaction: (transaction) => {
                const newState = view.state.apply(transaction);
                view.updateState(newState);
                
                if (transaction.docChanged) {
                    const newText = docToText(newState.doc);
                    setManuscriptText(newText);
                }
            }
        });

        viewRef.current = view;
        
        if (initialManuscriptTextRef.current === null) {
            initialManuscriptTextRef.current = manuscriptText;
        }

        return () => {
            console.log('📝 [DEBUG] Cleaning up ProseMirror editor');
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    // Step 2: useRef Stable Callback Pattern - Eliminates feedback loop
    const checkGrammarRef = useRef();
    
    // Keep checkGrammarRef.current updated with latest implementation
    useEffect(() => {
        console.log('🔧 [REF UPDATE] Updating checkGrammarRef.current');
        checkGrammarRef.current = () => {
            if (!manuscriptText.trim() || isGrammarChecking) {
                console.log('🔧 [REF FUNCTION] Early return - no text or already checking');
                return;
            }

            // --- DEBUG LOG: Always log before mute condition ---
            console.log("🔴 [RED LINE CHECK] Phase:", currentPhase, "Focus Edit:", isFocusEditActive, "HotfixStrict:", GRAMMAR_HOTFIX_STRICT, "EditMode:", editMode);

            // Step 2: Guard the Passive Grammar Check - Only execute when editMode === 'passive'
            if (editMode === 'passive') {
                // --- HOTFIX STRICT: Only allow grammar in assessment phase ---
                if (GRAMMAR_HOTFIX_STRICT && currentPhase !== "assessment") {
                    console.log("🔴 [RED LINE] Muted (hotfix strict). No fetch; clearing handled by watcher.");
                    return;
                }

                // --- CLEAN MUTE: Deep Dive or Focus Edit ---
                if (SUBSTANTIVE_PHASES.includes(currentPhase) || isFocusEditActive) {
                    console.log("🔴 [RED LINE] Muted (deep dive / focus). No fetch; clearing handled by watcher.");
                    return;
                }

                // --- DEBUG LOG: Proceeding ---
                console.log("🔴 [RED LINE] Running grammar check…");

                setIsGrammarChecking(true);
                
                const performValidation = async () => {
                    try {
                        const response = await fetch('/api/grammar-check', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: manuscriptText })
                        });

                        if (!response.ok) throw new Error(`Grammar check failed: ${response.status}`);

                        const { results } = await response.json();

                        // CHATGPT'S VALIDATED SOLUTION: Use existing mapping helper instead of manual transformation
                        const transformedSuggestions = mapGrammarMatchesToSuggestions(results, viewRef.current.state.doc);
                        console.log('[FIXED] Using mapGrammarMatchesToSuggestions:', transformedSuggestions);

                        let validatedSuggestions = [];
                        try {
                            const { suggestionsArraySchema } = await import('../schemas/suggestionSchema');
                            const validationResult = suggestionsArraySchema.safeParse(transformedSuggestions);
                            if (validationResult.success) {
                                validatedSuggestions = validationResult.data;
                                console.log('[FIXED] Validation SUCCESS:', validatedSuggestions.length, 'suggestions');
                            } else {
                                console.error("CRITICAL: Grammar suggestion validation failed!", validationResult.error.flatten());
                            }
                        } catch (err) {
                            console.error("CRITICAL: Zod schema import or validation failed!", err);
                        }

                        if (!viewRef.current) {
                            console.warn('🔴 [RED LINE] No editor view available');
                            return;
                        }

                        const newGrammarSuggestions = validatedSuggestions.length > 0 ? validatedSuggestions : [];

                        setGrammarSuggestions(prevGrammarSuggestions => {
                            // Compare new suggestions with existing ones
                            const suggestionsToKeep = prevGrammarSuggestions.filter(existing => {
                                return newGrammarSuggestions.some(newSug =>
                                    newSug.from === existing.from &&
                                    newSug.to === existing.to &&
                                    newSug.original === existing.original
                                );
                            });
                            const suggestionsToAdd = newGrammarSuggestions.filter(newSug => {
                                return !prevGrammarSuggestions.some(existing =>
                                    existing.from === newSug.from &&
                                    existing.to === newSug.to &&
                                    existing.original === newSug.original
                                );
                            });
                            const updatedState = [...suggestionsToKeep, ...suggestionsToAdd];
                            return updatedState;
                        });
                        lastGrammarCheckTextRef.current = manuscriptText;
                    } catch (error) {
                        console.error("An unexpected error occurred during grammar check:", error);
                        console.warn("🔴 [RED LINE] Could not connect to the grammar service. Is the LanguageTool server running?");
                        toast.error("Lulu's grammar service is not available. Please ensure the LanguageTool server is running.");
                        setGrammarSuggestions([]);
                    } finally {
                        setIsGrammarChecking(false);
                    }
                };
                
                performValidation();
            } else {
                // When not in passive mode, ensure grammar suggestions are cleared
                // Use current state from closure rather than triggering dependency
                setGrammarSuggestions(current => current.length > 0 ? [] : current);
            }
        };
    }, [manuscriptText, isGrammarChecking, currentPhase, isFocusEditActive, GRAMMAR_HOTFIX_STRICT, SUBSTANTIVE_PHASES, viewRef, editMode]); 
    // CRITICAL FIX: Removed grammarSuggestions from dependencies to prevent infinite feedback loop

    // Stable callback with empty dependency array - eliminates feedback loop
    const checkGrammar = useCallback(() => {
        console.log('🔧 [STABLE CALLBACK] checkGrammar called');
        if (checkGrammarRef.current) {
            console.log('🔧 [STABLE CALLBACK] Executing grammar check via ref');
            checkGrammarRef.current();
        } else {
            console.log('🔧 [STABLE CALLBACK] checkGrammarRef.current is null/undefined');
        }
    }, []);

    // REMOVED: Duplicate useEffect that called checkGrammar() - consolidated into single debounced effect below
    
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

    // Effect for State Cleanup on Phase Change (CORRECTED LOGIC)
const prevPhaseRef = useRef(currentPhase);
useEffect(() => {
    // Only run cleanup if the phase has actually CHANGED
    if (prevPhaseRef.current !== currentPhase) {
        console.log(`🧹 [DEBUG] Phase changed from ${prevPhaseRef.current} to ${currentPhase}. Cleaning up...`);

        if (currentPhase === 'assessment') {
            setSubstantiveSuggestions([]);
            setGrammarSuggestions([]);
        }

        // Clear fetch tracking whenever the phase changes
        sentenceLevelFetchedRef.current.clear();
        console.log('🧹 [DEBUG] Cleared sentence-level fetch tracking for new phase:', currentPhase);
    }
    // Always update the ref for the next render
    prevPhaseRef.current = currentPhase;
}, [currentPhase]); // Dependency remains on currentPhase

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
                        
                        // SEPARATE SUGGESTION STATE: Update sentence-level suggestions
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
                
                // Step 3: Entering Active Mode - Set deep-dive mode for substantive edits
                setEditMode('deep-dive');
                
                // Step 5: UX Feedback Notification for entering deep-dive mode
                toast('Deep dive activated. Passive checks are now paused.');
                
                // SEPARATE SUGGESTION STATE: Update substantive suggestions  
                console.log('🎯 [DEBUG] About to call setSubstantiveSuggestions (substantive)');
                setSubstantiveSuggestions(groupedSubstantiveEdits);
                console.log('🎯 [DEBUG] setSubstantiveSuggestions completed successfully (substantive)');
            }
        }
    }, [currentGoal, goalEdits, actions]);

    // TASK 4: Single Synchronization Point - Unified Suggestion State with ProseMirror
    useEffect(() => {
        console.log('[INSTRUMENT] ProseMirror sync useEffect FIRED. activeSuggestions:', activeSuggestions);
        if (!viewRef.current) {
            console.log('[INSTRUMENT] No viewRef.current, skipping ProseMirror sync');
            return;
        }
        console.log('[INSTRUMENT] About to call pmSetSuggestions with:', activeSuggestions);
        try {
            pmSetSuggestions(viewRef.current, activeSuggestions);
            console.log('[INSTRUMENT] pmSetSuggestions completed. Plugin state:', coreSuggestionPluginKey.getState(viewRef.current.state));
        } catch (error) {
            console.error('[INSTRUMENT] ERROR in pmSetSuggestions:', error);
        }
    }, [activeSuggestions]);

    // Red Line Grammar Check Integration - Single debounced trigger (Step 1: Consolidated)
    useEffect(() => {
        console.log('🔴 [RED LINE] Debounced effect triggered - scheduling grammar check in 2s');
        // Debounce grammar checking - wait 2 seconds after text changes
        const timeoutId = setTimeout(checkGrammar, 2000);
        return () => clearTimeout(timeoutId);
    }, [manuscriptText]); // CLAUDE'S VALIDATED SOLUTION: Remove checkGrammar from dependencies since it's stable

    // NEW: Mute watcher effect to clear grammar suggestions when entering muted context
    useEffect(() => {
        const inDeepDive = SUBSTANTIVE_PHASES.includes(currentPhase);
        const shouldMuteClean = inDeepDive || isFocusEditActive;
        const shouldMuteHotfix = GRAMMAR_HOTFIX_STRICT && currentPhase !== "assessment";
        const shouldMute = shouldMuteHotfix || shouldMuteClean;

        if (shouldMute) {
            console.log("🔴 [RED LINE] Mute watcher: clearing existing grammar suggestions.");
            // Use functional update to avoid reading current state in dependency
            setGrammarSuggestions(current => current.length > 0 ? [] : current);
        }
    }, [currentPhase, isFocusEditActive, GRAMMAR_HOTFIX_STRICT, SUBSTANTIVE_PHASES]); 
    // CRITICAL FIX: Removed grammarSuggestions and viewRef to prevent feedback loop

    // Action Handlers (UPDATED: Using Separate Suggestion States with Position Remapping)
    const handleGoalComplete = useCallback(() => {
        // DEEP DIVE COMPLETION: Pass remaining suggestions to check if phase can complete
        const allRemainingSuggestions = [...substantiveSuggestions, ...grammarSuggestions];
        
        if (nextGoal) {
            actions.advanceToNextGoal();
        } else {
            const phaseCompleted = actions.completeCurrentPhase(allRemainingSuggestions);
            if (!phaseCompleted) {
                // Show user feedback that edits must be completed first
                console.log('📝 [USER FEEDBACK] Please complete all remaining edits before finishing this phase');
                // Could add toast notification here
            } else {
                // Step 4: Exiting Active Mode - Final goal completed, reset to passive mode
                setEditMode('passive');
                setSubstantiveSuggestions([]);
                
                // Step 5: UX Feedback Notification for exiting active mode
                toast.success('Returning to passive review. I\'ll keep an eye out for grammar and style.');
            }
        }
    }, [actions, nextGoal, substantiveSuggestions, grammarSuggestions]);

    const handleAcceptChoice = useCallback((suggestionId) => {
        console.log("[INSTRUMENT] handleAcceptChoice CREATED. Dependencies:", {substantiveSuggestions, grammarSuggestions});
        
        // FORENSIC TRACE: Start of accept operation
        performance.mark('accept-start');
        console.log("🔍 [FORENSIC] Accept operation initiated for suggestion:", suggestionId);
        
        if (!viewRef.current) {
            console.error("[ACCEPT] ViewRef is not available. Aborting.");
            return;
        }

        // --- Step 1: Identify the suggestion and its source list ---
        let sourceArray;
        let setState;

        const isSubstantive = substantiveSuggestions.some(s => s.id === suggestionId);
        if (isSubstantive) {
            sourceArray = substantiveSuggestions;
            setState = setSubstantiveSuggestions;
        } else {
            sourceArray = grammarSuggestions;
            setState = setGrammarSuggestions;
        }

        console.log("[INSTRUMENT] handleAcceptChoice INVOKED. State at invocation:", {
            suggestionId,
            sourceArray,
            substantiveSuggestions,
            grammarSuggestions
        });

        // --- Step 2: Command "The Will" to update the document ---
        console.log("[INSTRUMENT] Document BEFORE mutation:", docToText(viewRef.current.state.doc));
        
        // FORENSIC TRACE: Mark ProseMirror transaction dispatch
        performance.mark('prosemirror-transaction-start');
        pmAcceptSuggestion(viewRef.current, suggestionId);
        performance.mark('prosemirror-transaction-dispatch');
        
        console.log(`✅ [ACCEPT] ProseMirror document updated for suggestion: ${suggestionId}`);
        console.log("[INSTRUMENT] Document AFTER mutation:", docToText(viewRef.current.state.doc));

        // --- Step 3: The Mind Reconciles Its State ---
        const remainingSuggestions = sourceArray.filter(s => s.id !== suggestionId);
        console.log("[INSTRUMENT] Remaining suggestions after accept:", remainingSuggestions);

        // --- Step 4: Just-in-Time Remapping ---
        console.log(`🧠 [RECONCILE] Remapping ${remainingSuggestions.length} remaining suggestions...`);
        const remappedSuggestions = remainingSuggestions.map(suggestion => {
            const newPosition = findPositionOfText(viewRef.current.state.doc, suggestion.original);
            if (newPosition) {
                return { ...suggestion, from: newPosition.from, to: newPosition.to };
            }
            console.warn(`[RECONCILE] Discarding obsolete suggestion as its text can no longer be found: "${suggestion.original}"`);
            return null;
        }).filter(Boolean);
        console.log(`🧠 [RECONCILE] Remapping complete. ${remappedSuggestions.length} suggestions remain valid.`, remappedSuggestions);

        // --- Step 5: Commit the Reconciled State to The Mind ---
        performance.mark('react-state-update-start');
        setState(remappedSuggestions);
        setActiveConflictGroup(null);
        performance.mark('react-state-update-complete');

        // FORENSIC MEASUREMENT: Analyze timing
        setTimeout(() => {
            try {
                performance.measure('total-accept-time', 'accept-start', 'react-state-update-complete');
                performance.measure('prosemirror-transaction-time', 'prosemirror-transaction-start', 'prosemirror-transaction-dispatch');
                performance.measure('state-reconciliation-time', 'prosemirror-transaction-dispatch', 'react-state-update-complete');
                
                // Measure popover timing if markers exist
                const popoverHideMarks = performance.getEntriesByName('popover-hide-start');
                if (popoverHideMarks.length > 0) {
                    performance.measure('popover-hide-time', 'popover-hide-start', 'popover-hide-complete');
                    performance.measure('popover-to-prosemirror-delay', 'popover-hide-complete', 'prosemirror-transaction-start');
                }
                
                const measurements = performance.getEntriesByType('measure');
                console.log("🔍 [FORENSIC TIMING ANALYSIS]:");
                measurements.forEach(measure => {
                    if (measure.name.includes('accept') || measure.name.includes('prosemirror') || 
                        measure.name.includes('state') || measure.name.includes('popover')) {
                        console.log(`  ${measure.name}: ${measure.duration.toFixed(2)}ms`);
                    }
                });
                
                // Clear markers for next operation
                performance.clearMarks();
                performance.clearMeasures();
            } catch (e) {
                console.warn("Performance measurement unavailable:", e);
            }
        }, 0);

    }, [substantiveSuggestions, grammarSuggestions]);

    // Soft reject: remove suggestion from plugin and separate suggestion states without applying
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
            
            // SEPARATE SUGGESTION STATE: Update both states after rejection
            const newSubstantive = newSuggestions.filter(s => s.type !== 'passive');
            const newGrammar = newSuggestions.filter(s => s.type === 'passive');
            
            setSubstantiveSuggestions(newSubstantive);
            setGrammarSuggestions(newGrammar);
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
        
        const suggestion = activeSuggestions.find(s => s.id === suggestionId);
        if (suggestion) {
            setPopoverTarget(event.target);
            setActivePopoverSuggestion(suggestion);
        }
    }, [activeSuggestions]);

    const handleSuggestionMouseLeave = useCallback(() => {
        // Coyote Time: Schedule delayed close with 300ms grace period
        popoverCloseTimerRef.current = setTimeout(() => {
            performance.mark('popover-unmount-start');
            console.log("🔍 [FORENSIC] Popover natural timeout unmount initiated");
            setPopoverTarget(null);
            setActivePopoverSuggestion(null);
            popoverCloseTimerRef.current = null;
            performance.mark('popover-unmount-complete');
        }, 300);
    }, []);

    // Add placeholder handlers for the popover's own buttons
    const handlePopoverAccept = useCallback((suggestionId) => {
        // INVESTIGATION #2 FIX: Proactively hide popover before accept to prevent phantom flicker
        performance.mark('popover-hide-start');
        console.log("🔍 [FORENSIC] Popover accept clicked, proactively hiding popover");
        
        setPopoverTarget(null);
        setActivePopoverSuggestion(null);
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        performance.mark('popover-hide-complete');
        
        // Now execute the accept logic
        handleAcceptChoice(suggestionId);
    }, [handleAcceptChoice]);

    // CENTRALIZED REJECT HANDLER: Remove suggestion from all active lists and log
    const handleRejectSuggestion = useCallback((suggestionId) => {
        console.log(`❌ [REJECT] Rejecting active suggestion: ${suggestionId}`);
        
        setPopoverTarget(null);
        setActivePopoverSuggestion(null);
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        setSubstantiveSuggestions(prev => {
            const filtered = prev.filter(s => s.id !== suggestionId);
            console.log(`❌ [REJECT] SubstantiveSuggestions: ${filtered.length} (was ${prev.length})`);
            return filtered;
        });
        setGrammarSuggestions(prev => {
            const filtered = prev.filter(s => s.id !== suggestionId);
            console.log(`❌ [REJECT] GrammarSuggestions: ${filtered.length} (was ${prev.length})`);
            return filtered;
        });
    }, [setSubstantiveSuggestions, setGrammarSuggestions]);

    // Add new wrapper function for popover reject to mirror handlePopoverAccept pattern
    const handlePopoverReject = useCallback((suggestionId) => {
        console.log("❌ [REJECT] Popover Reject button clicked for suggestion:", suggestionId);
        // Proactively hide the popover to prevent UI glitches
        setPopoverTarget(null);
        setActivePopoverSuggestion(null);
        if (popoverCloseTimerRef.current) {
            clearTimeout(popoverCloseTimerRef.current);
            popoverCloseTimerRef.current = null;
        }
        // Call the main rejection logic
        handleRejectSuggestion(suggestionId);
    }, [handleRejectSuggestion]);

    const handlePopoverLearnMore = useCallback((suggestion) => console.log("Learn More:", suggestion), []);
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

        // INVESTIGATION #1 FIX: Re-implement click-to-accept for passive suggestions
        const handleClick = (event) => {
            const target = event.target;
            if (target.classList.contains('suggestion-highlight') && target.classList.contains('passive')) {
                // FORENSIC TRACE: Mark the start of accept operation
                performance.mark('accept-start');
                console.log("🔍 [FORENSIC] Passive suggestion clicked, initiating accept sequence");
                
                const suggestionId = target.getAttribute('data-suggestion-id');
                if (suggestionId) {
                    console.log("🔍 [FORENSIC] Calling handleAcceptChoice for suggestion:", suggestionId);
                    
                    // Proactively hide popover before ProseMirror transaction to prevent phantom flicker
                    performance.mark('popover-hide-start');
                    setPopoverTarget(null);
                    setActivePopoverSuggestion(null);
                    if (popoverCloseTimerRef.current) {
                        clearTimeout(popoverCloseTimerRef.current);
                        popoverCloseTimerRef.current = null;
                    }
                    performance.mark('popover-hide-complete');
                    
                    // Now execute the accept logic
                    handleAcceptChoice(suggestionId);
                }
                event.preventDefault();
                event.stopPropagation();
            }
        };

        editorContainer.addEventListener('mouseenter', handleMouseEnter, true);
        editorContainer.addEventListener('mouseleave', handleMouseLeave, true);
        editorContainer.addEventListener('click', handleClick, true);

        return () => {
            editorContainer.removeEventListener('mouseenter', handleMouseEnter, true);
            editorContainer.removeEventListener('mouseleave', handleMouseLeave, true);
            editorContainer.removeEventListener('click', handleClick, true);
        };
    }, [handleSuggestionMouseEnter, handleSuggestionMouseLeave, handleAcceptChoice]);

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
        
        // Step 3: Entering Active Mode - Set focus mode and clear grammar suggestions
        setEditMode('focus');
        setGrammarSuggestions([]);
        
        setIsFocusEditActive(true);
        setIsFocusEditProcessing(true);
        
        // Step 5: UX Feedback Notification for entering active mode
        toast('Focusing on your craft. Passive checks are now paused.');
        
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
            setSubstantiveSuggestions(grouped);
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
        // Step 4: Exiting Active Mode - Reset to passive mode and clear substantive suggestions
        setEditMode('passive');
        setSubstantiveSuggestions([]);
        
        setIsFocusEditActive(false);
        setIsFocusEditProcessing(false);
        
        // Step 5: UX Feedback Notification for exiting active mode
        toast.success('Returning to passive review. I\'ll keep an eye out for grammar and style.');
        
        // Do not clear activeSuggestions here; caller controls when to clear
    }, []);

    // Main Render - Sophisticated Writer's Desk Layout with Smart MentorWing
    return (
        <>
            {/* Step 5: UX Feedback - Toast notifications for mode changes */}
            <Toaster />
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
                        onRejectChoice={handleRejectSuggestion}
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
                    onReject={handlePopoverReject}
                    onClose={handlePopoverClose}
                    onPopoverEnter={handlePopoverMouseEnter}
                    onPopoverLeave={handlePopoverMouseLeave}
                />
            )}
            {/* Toast Notifications */}
            <Toaster />
        </>
    );
}

export default IndexV2;