// /hooks/useWorkflowActions.js
// 
// CHANGES MADE:
// - Modified fetchSuggestionsForPhase to accept optional overrideEditTypes parameter
// - Maintains backward compatibility: if overrideEditTypes provided, uses that array
// - If not provided, falls back to existing phase-based behavior
// - Enables Focus Edit consultation to request ['Line', 'Copy'] edit types
// - TASK 1 FIX: Updated executeApprovedPlan to accept optional filteredGoals parameter

import { useCallback, useRef, useEffect } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

// Map workflow phases to API edit types
const phaseToEditType = (phase) => {
  const mapping = {
    'developmental': 'Developmental',
    'structural': 'Structural',
    'line': 'Line',
    'copy': 'Copy',
    'proof': 'Proofreading'
  };
  return mapping[phase] || phase;
};

export function useWorkflowActions() {
  const { state, dispatch } = useWorkflow();

  const workflowStateRef = useRef(state);
  useEffect(() => {
    workflowStateRef.current = state;
  }, [state]);

  // This is the full, working version.
  const prepareEditorialPlan = useCallback(async (writerNotes, manuscriptText) => {
    dispatch({ type: 'PREPARE_PLAN_START' });
    try {
      const response = await fetch('/api/editorial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptText, writerNotes }),
      });
      if (!response.ok) throw new Error('API request failed.');
      const apiResult = await response.json();
      dispatch({ type: 'PREPARE_PLAN_SUCCESS', payload: { editorialPlan: apiResult.editorialPlan } });
    } catch (error) {
      dispatch({ type: 'PREPARE_PLAN_FAILURE', payload: { error: error.message } });
    }
  }, [dispatch]);

  // This is the stable version that uses the ref and will NOT cause a loop.
  // MODIFICATION: Added optional overrideEditTypes parameter for Focus Edit consultation
  const fetchSuggestionsForPhase = useCallback(async (manuscriptText, overrideEditTypes) => {
    console.log('🔍 [DEBUG] fetchSuggestionsForPhase STARTED');
    
    const phase = workflowStateRef.current.currentPhase;
    console.log('🔍 [DEBUG] Current phase:', phase);
    
    if (phase === 'assessment' || phase === 'complete') {
      console.log('🔍 [DEBUG] Early return for assessment/complete phase');
      return [];
    }

    console.log('🔍 [DEBUG] Setting isProcessing to true');
    dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: true } });
    
    try {
      // Use overrideEditTypes if provided, otherwise fall back to phase-based logic
      const editTypesForAPI = overrideEditTypes || [phaseToEditType(phase)];
      console.log('🔍 [DEBUG] Edit types for API:', editTypesForAPI);
      
      console.log('🔍 [DEBUG] About to call fetch API');
      // Use the new sentence-level-edits endpoint for cascade workflow
      const response = await fetch('/api/sentence-level-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manuscriptText, editTypes: editTypesForAPI }),
      });
      
      console.log('🔍 [DEBUG] Fetch response received, ok:', response.ok);
      if (!response.ok) throw new Error(`API request failed: ${response.status}`);
      
      console.log('🔍 [DEBUG] Parsing JSON response');
      const apiResult = await response.json();
      console.log('🔍 [DEBUG] API result:', apiResult);
      
      const suggestionsFromApi = apiResult?.suggestions || [];
      console.log('🔍 [DEBUG] Extracted suggestions:', suggestionsFromApi.length, 'items');
      
      console.log('🔍 [DEBUG] Setting isProcessing to false');
      dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: false } });
      
      console.log('🔍 [DEBUG] Returning suggestions, fetchSuggestionsForPhase COMPLETED');
      return suggestionsFromApi;
    } catch (error) {
      console.error('🔍 [DEBUG] ERROR in fetchSuggestionsForPhase:', error);
      dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: false } });
      return [];
    }
  }, [dispatch]);


  // All other actions are also included and stable.
  const fetchEditsForGoal = useCallback(async (goal, manuscriptText) => {
    dispatch({ type: 'FETCH_GOAL_EDITS_START', payload: { goalId: goal.id } });
    try {
      const response = await fetch('/api/get-edits-for-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.goal, manuscriptText }),
      });
      if (!response.ok) throw new Error('The new intelligence API failed to respond.');
      const edits = await response.json();
      dispatch({ type: 'FETCH_GOAL_EDITS_SUCCESS', payload: { goalId: goal.id, edits } });
    } catch (error) {
      console.error('Error fetching edits for goal:', error);
      dispatch({ type: 'FETCH_GOAL_EDITS_FAILURE', payload: { goalId: goal.id } });
    }
  }, [dispatch]);

  const prefetchEditsForGoal = useCallback(async (goal, manuscriptText) => {
    if (workflowStateRef.current.goalEdits[goal.id]) return;
    try {
      const response = await fetch('/api/get-edits-for-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.goal, manuscriptText }),
      });
      if (!response.ok) return;
      const edits = await response.json();
      dispatch({ type: 'FETCH_GOAL_EDITS_SUCCESS', payload: { goalId: goal.id, edits } });
    } catch (error) {
      console.warn('Sous-Chef pre-fetch failed silently:', error);
    }
  }, [dispatch]);

  const executeApprovedPlan = useCallback((workflowType, filteredGoals) => { 
    dispatch({ type: 'EXECUTE_APPROVED_PLAN', payload: { workflowType, filteredGoals } }); 
  }, [dispatch]);
  
  // TASK 2 FIX: Action to update goal edits with position mapping
  const updateGoalEditsWithPositions = useCallback((goalId, positionedEdits) => {
    dispatch({ type: 'UPDATE_GOAL_EDITS_WITH_POSITIONS', payload: { goalId, positionedEdits } });
  }, [dispatch]);
  
  const advanceToNextGoal = useCallback(() => { dispatch({ type: 'ADVANCE_GOAL' }); }, [dispatch]);
  const completeCurrentPhase = useCallback(() => { dispatch({ type: 'COMPLETE_AND_ADVANCE_PHASE' }); }, [dispatch]);
  const resetWorkflow = useCallback(() => { dispatch({ type: 'RESET_WORKFLOW' }); }, [dispatch]);

  return {
    prepareEditorialPlan,
    executeApprovedPlan,
    fetchSuggestionsForPhase,
    completeCurrentPhase,
    resetWorkflow,
    fetchEditsForGoal,
    prefetchEditsForGoal,
    advanceToNextGoal,
    updateGoalEditsWithPositions,
  };
}