"use client";

import React, { createContext, useContext, useReducer } from 'react';
import { WORKFLOWS } from '../utils/editorConfig';

export const initialState = {
  currentWorkflow: 'pro',
  currentPhase: 'assessment',
  workflowPhases: WORKFLOWS.pro.phases,
  isProcessing: false,
  error: null,
  completedPhases: new Set(),
  editorialPlan: null,
  currentGoalIndex: null,
  goalEdits: {},
  isFetchingEdits: false, 
};

export function workflowReducer(state, action) {
  switch (action.type) {
    // ... all of your other cases from PREPARE_PLAN_START to FETCH_GOAL_EDITS_FAILURE remain the same ...
    
    case 'PREPARE_PLAN_START': {
      return { ...state, isProcessing: true, error: null, editorialPlan: null };
    }
    case 'PREPARE_PLAN_SUCCESS': {
      return {
        ...state,
        isProcessing: false,
        editorialPlan: action.payload.editorialPlan,
        error: null,
      };
    }
    case 'PREPARE_PLAN_FAILURE': {
        return { ...state, isProcessing: false, error: action.payload.error };
    }
    case 'EXECUTE_APPROVED_PLAN': {
        const workflowType = action.payload.workflowType || state.currentWorkflow;
        const filteredGoals = action.payload.filteredGoals;
        const newWorkflow = WORKFLOWS[workflowType];
        if (!newWorkflow) return state;
        const isSubstantiveWorkflow = newWorkflow.phases.includes('developmental') || newWorkflow.phases.includes('structural');
        
        const updatedEditorialPlan = filteredGoals ? filteredGoals : state.editorialPlan;
        
        return {
            ...state,
            currentWorkflow: workflowType,
            workflowPhases: newWorkflow.phases,
            currentPhase: newWorkflow.phases[1] || 'complete',
            currentGoalIndex: isSubstantiveWorkflow ? 0 : null,
            editorialPlan: updatedEditorialPlan,
        };
    }
    case 'FETCH_GOAL_EDITS_START':
      return {
        ...state,
        isFetchingEdits: true,
        goalEdits: {
          ...state.goalEdits,
          [action.payload.goalId]: { status: 'loading', edits: [] },
        }
      };
    case 'FETCH_GOAL_EDITS_SUCCESS':
      return {
        ...state,
        isFetchingEdits: false,
        goalEdits: {
          ...state.goalEdits,
          [action.payload.goalId]: { status: 'loaded', edits: action.payload.edits },
        }
      };
    case 'FETCH_GOAL_EDITS_FAILURE':
       return {
        ...state,
        isFetchingEdits: false,
        goalEdits: {
          ...state.goalEdits,
          [action.payload.goalId]: { status: 'error', edits: [] },
        }
      };
    
    // FIX: This new logic correctly distributes the fetched edits to ALL selected goals.
    case 'FETCH_DEEP_DIVE_SUCCESS': {
      const newGoalEdits = { ...state.goalEdits };
      const allSuggestions = action.payload.suggestions;

      // Find the goals that were just requested
      const requestedGoalIds = (state.editorialPlan || [])
        .filter(goal => goal.isSelected !== false) // Assuming default is selected
        .map(goal => goal.id);

      // Assign the entire batch of suggestions to each requested goal's edit list
      requestedGoalIds.forEach(goalId => {
        newGoalEdits[goalId] = {
          status: 'loaded',
          edits: allSuggestions
        };
      });

      return {
        ...state,
        isProcessing: false,
        goalEdits: newGoalEdits,
        error: null,
      };
    }

    case 'FETCH_DEEP_DIVE_FAILURE':
      return {
        ...state,
        isProcessing: false,
        error: 'Failed to fetch specific edits.',
      };
    
    case 'ADVANCE_GOAL': {
      if (state.currentGoalIndex === null) return state;
      const nextIndex = state.currentGoalIndex + 1;
      const substantiveGoals = (state.editorialPlan || []).filter(goal => 
          ['developmental', 'structural'].includes(goal.type.toLowerCase())
      );
      if (nextIndex >= substantiveGoals.length) {
        return { ...state, currentGoalIndex: null };
      }
      return { ...state, currentGoalIndex: nextIndex };
    }
    case 'COMPLETE_AND_ADVANCE_PHASE': {
      const completedPhases = new Set(state.completedPhases).add(state.currentPhase);
      const currentIndex = state.workflowPhases.indexOf(state.currentPhase);
      const currentWorkflowPhases = WORKFLOWS[state.currentWorkflow].phases;
      if (currentIndex >= currentWorkflowPhases.length - 1) {
        return { ...state, currentPhase: 'complete', completedPhases, isProcessing: false };
      }
      const nextPhase = currentWorkflowPhases[currentIndex + 1];
      return { ...state, currentPhase: nextPhase, completedPhases, isProcessing: false };
    }
    case 'SET_IS_PROCESSING': {
      return { ...state, isProcessing: action.payload.isProcessing };
    }
    case 'UPDATE_GOAL_EDITS_WITH_POSITIONS': {
      const { goalId, positionedEdits } = action.payload;
      return {
        ...state,
        goalEdits: {
          ...state.goalEdits,
          [goalId]: {
            ...state.goalEdits[goalId],
            edits: positionedEdits,
            positionsMapped: true,
          }
        }
      };
    }
    case 'RESET_WORKFLOW': {
      return { ...initialState };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

export const WorkflowContext = createContext();

export function WorkflowProvider({ children }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const value = { state, dispatch };
  return ( <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider> );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}