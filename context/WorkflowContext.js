// /context/WorkflowContext.js
"use client";

import React, { createContext, useContext, useReducer } from 'react';
import { WORKFLOWS } from '../utils/editorConfig';

// --- The Initial State ---
export const initialState = {
  currentWorkflow: 'pro',
  currentPhase: 'assessment',
  workflowPhases: WORKFLOWS.pro.phases,
  isProcessing: false,
  error: null,
  completedPhases: new Set(), // --- The restored property ---

  // State for the "Pre-Flight Briefing"
  editorialPlan: null,
  suggestionPayload: [],
};

// --- The Reducer ---
// The "Mind's" rulebook, updated with the new workflow logic.
export function workflowReducer(state, action) {
  switch (action.type) {
    // --- NEW: Actions for the "Pre-Flight Briefing" Workflow ---
    case 'PREPARE_PLAN_START': {
      return {
        ...state,
        isProcessing: true,
        error: null,
        editorialPlan: null,
        suggestionPayload: [],
      };
    }
    case 'PREPARE_PLAN_SUCCESS': {
      return {
        ...state,
        isProcessing: false,
        editorialPlan: action.payload.editorialPlan,
        suggestionPayload: action.payload.suggestionPayload,
      };
    }
    case 'PREPARE_PLAN_FAILURE': {
        return {
            ...state,
            isProcessing: false,
            error: action.payload.error,
        };
    }

    // This action is now triggered by the user approving the Editorial Plan
    case 'EXECUTE_APPROVED_PLAN': {
        const workflowType = action.payload.workflowType || state.currentWorkflow;
        const newWorkflow = WORKFLOWS[workflowType];
        if (!newWorkflow) return state;

        return {
            ...state,
            currentWorkflow: workflowType,
            workflowPhases: newWorkflow.phases,
            currentPhase: newWorkflow.phases[1] || 'complete', // Advance past 'assessment'
            isProcessing: true, // Enter processing state to fetch the first round of edits
        };
    }

    // --- Actions for the Editing Cascade ---
    case 'COMPLETE_AND_ADVANCE_PHASE': {
      const completedPhases = new Set(state.completedPhases).add(state.currentPhase);
      const currentIndex = state.workflowPhases.indexOf(state.currentPhase);
      
      const currentWorkflowPhases = WORKFLOWS[state.currentWorkflow].phases;
      if (currentIndex >= currentWorkflowPhases.length - 1) {
        return { ...state, currentPhase: 'complete', completedPhases, isProcessing: false };
      }
      
      const nextPhase = currentWorkflowPhases[currentIndex + 1];

      return {
        ...state,
        currentPhase: nextPhase,
        completedPhases,
        isProcessing: true, // Enter processing state for the next phase
      };
    }
    case 'SET_IS_PROCESSING': {
      return { ...state, isProcessing: action.payload.isProcessing };
    }
    case 'RESET_WORKFLOW': {
      return { ...initialState };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

// --- The Context, Provider, and Hook (These remain the same) ---
export const WorkflowContext = createContext();

export function WorkflowProvider({ children }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const value = { state, dispatch };
  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider> // --- The corrected closing tag ---
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}