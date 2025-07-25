// /components/WorkflowAssessment.jsx
"use client";

import React from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';

// This component is now 'connected' to our workflow engine.
// It no longer needs a long list of props because it can get state
// and actions directly from our custom hooks.
export default function WorkflowAssessment({ manuscriptText }) {
  // Connect to the "Mind" to get the current state
  const { state } = useWorkflow();
  const { isProcessing, manuscriptAnalysis } = state;

  // Connect to the "Will" to get the actions we can perform
  const actions = useWorkflowActions();

  const handleAnalyzeClick = () => {
    // We simply call the action from our actions hook.
    // This component doesn't need to know HOW the analysis is done.
    actions.startAnalysis(manuscriptText);
  };

  const handleAcceptClick = () => {
    // The component tells the "Will" the user's intent.
    // The "Will" then commands the "Mind" to change the workflow.
    actions.acceptRecommendation('pro');
  };

  // --- Conditional Rendering based on state from the Context ---

  // State 1: The analysis is running
  if (isProcessing) {
    return (
      <div className="p-4 text-center">
        <p className="text-lg font-semibold animate-pulse text-purple-700">Analyzing Manuscript...</p>
        <p className="text-sm text-gray-500 mt-2">Lulu is reading your work to understand its structure and style.</p>
      </div>
    );
  }

  // State 2: The analysis is complete and we have a result
  if (manuscriptAnalysis) {
    return (
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-3">Manuscript Analysis</h3>
        <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg border">
          <p><strong>Word Count:</strong> {manuscriptAnalysis.wordCount.toLocaleString()}</p>
          <p><strong>Complexity:</strong> {manuscriptAnalysis.complexity}</p>
          <p><strong>Reading Level:</strong> {manuscriptAnalysis.readingLevel}</p>
          <p><strong>Suggested Focus:</strong> {manuscriptAnalysis.primaryNeeds.join(', ')}</p>
        </div>
        <p className="text-xs text-gray-600 mt-4">{manuscriptAnalysis.insights}</p>
        <button
          onClick={handleAcceptClick}
          className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Accept Recommendation & Begin Pro Edit
        </button>
      </div>
    );
  }

  // State 3: The initial, default view
  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Begin Editing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Start by letting Lulu analyze your manuscript to recommend a professional editing workflow.
      </p>
      <button
        onClick={handleAnalyzeClick}
        disabled={!manuscriptText || manuscriptText.trim().length < 10}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Analyze Manuscript
      </button>
    </div>
  );
}