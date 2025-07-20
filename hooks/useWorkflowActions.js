// /hooks/useWorkflowActions.js
import { useCallback } from 'react';
import { useWorkflow } from '../context/WorkflowContext';

// --- The "Will": A collection of functions that perform actions ---
export function useWorkflowActions() {
  // Connect to the "Mind" to get the state and dispatch function.
  const { state, dispatch } = useWorkflow();

  // --- "Pre-Flight Briefing" Action ---
  const prepareEditorialPlan = useCallback(async (writerNotes, manuscriptText) => {
    dispatch({ type: 'PREPARE_PLAN_START' });
    try {
      console.log("Will is consulting the Planner API with notes:", writerNotes);
      const response = await fetch('/api/editorial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptText,
          writerNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The API request failed.');
      }

      const apiResult = await response.json();
      dispatch({
        type: 'PREPARE_PLAN_SUCCESS',
        payload: {
          editorialPlan: apiResult.editorialPlan,
          suggestionPayload: apiResult.suggestionPayload
        }
      });
    } catch (error) {
      console.error('Editorial Plan preparation error:', error);
      dispatch({ type: 'PREPARE_PLAN_FAILURE', payload: { error: error.message } });
    }
  }, [dispatch]);

  // --- NEW: The action to begin the specific edits ---
  const executeApprovedPlan = useCallback((workflowType) => {
    // This action correctly includes the payload object.
    dispatch({
      type: 'EXECUTE_APPROVED_PLAN',
      payload: { workflowType }
    });
  }, [dispatch]);


  // --- Editing Phase Actions ---
  const fetchSuggestionsForPhase = useCallback(async (manuscriptText) => {
    const phase = state.currentPhase;
    if (phase === 'assessment' || phase === 'complete') return [];

    console.log(`Will is fetching suggestions for phase: ${phase}`);
    dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: true } });

    try {
      const response = await fetch('/api/specific-edits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: manuscriptText,
          mode: 'Specific Edits',
          editTypes: [phase]
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiResult = await response.json();
      let suggestionsFromApi = [];
      if (apiResult && apiResult.suggestions) {
        if (Array.isArray(apiResult.suggestions)) {
          suggestionsFromApi = apiResult.suggestions;
        } else if (typeof apiResult.suggestions === 'object' && apiResult.suggestions !== null) {
          suggestionsFromApi = Object.values(apiResult.suggestions).flat();
        }
      }
      
      dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: false } });
      return suggestionsFromApi;

    } catch (error) {
      console.error(`Error fetching suggestions for phase ${phase}:`, error);
      dispatch({ type: 'SET_IS_PROCESSING', payload: { isProcessing: false } });
      return [];
    }
  }, [state.currentPhase, dispatch]);

  const completeCurrentPhase = useCallback(() => {
    dispatch({ type: 'COMPLETE_AND_ADVANCE_PHASE' });
  }, [dispatch]);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
  }, [dispatch]);


  // --- Return the public interface for the "Will" ---
  return {
    prepareEditorialPlan,
    executeApprovedPlan,
    fetchSuggestionsForPhase,
    completeCurrentPhase,
    resetWorkflow,
  };
}