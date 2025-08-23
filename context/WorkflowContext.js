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
    case 'PREPARE_PLAN_START': {
      return { ...state, isProcessing: true, error: null, editorialPlan: null };
    }
    case 'PREPARE_PLAN_SUCCESS': {
      return {
        ...state,
        isProcessing: false,
        editorialPlan: action.payload.editorialPlan,
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
        
        // TASK 1 FIX: If filteredGoals provided, save only selected goals to editorialPlan
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
    case 'ADVANCE_GOAL': {
      if (state.currentGoalIndex === null) return state;
      const nextIndex = state.currentGoalIndex + 1;
      const substantiveGoals = (state.editorialPlan || []).filter(goal => 
          ['developmental', 'structural'].includes(goal.type.toLowerCase())
      );
      if (nextIndex >= substantiveGoals.length) {
        // FIX: When finishing final substantive goal, progress to next phase instead of just resetting
        const completedPhases = new Set(state.completedPhases).add(state.currentPhase);
        const currentIndex = state.workflowPhases.indexOf(state.currentPhase);
        const currentWorkflowPhases = WORKFLOWS[state.currentWorkflow].phases;
        if (currentIndex >= currentWorkflowPhases.length - 1) {
          return { ...state, currentPhase: 'complete', completedPhases, isProcessing: false, currentGoalIndex: null };
        }
        const nextPhase = currentWorkflowPhases[currentIndex + 1];
        return { ...state, currentPhase: nextPhase, completedPhases, isProcessing: false, currentGoalIndex: null };
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