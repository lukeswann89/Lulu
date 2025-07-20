// /components/AssessmentPanel.jsx
"use client";

import React from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';

export default function AssessmentPanel({ manuscriptText }) {
  // Connect to the "Mind" to get the current state
  const { state } = useWorkflow();
  const { isProcessing, manuscriptAnalysis } = state;

  // Connect to the "Will" to get the actions we can perform
  const { startAnalysis, acceptRecommendation } = useWorkflowActions();

  // Handler for the main action button
  const handleStartClick = () => {
    startAnalysis(manuscriptText);
  };

  // Handler for accepting the recommended workflow
  const handleAcceptClick = () => {
    // For now, we'll hard-code the 'pro' workflow as the recommendation
    acceptRecommendation('pro');
  };

  // --- Render logic based on the current state ---

  if (isProcessing) {
    return (
      <div className="p-4 text-center">
        <p className="text-lg font-semibold animate-pulse text-purple-700">Analyzing Manuscript...</p>
        <p className="text-sm text-gray-500 mt-2">Lulu is reading your work to understand its structure and style.</p>
      </div>
    );
  }

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

  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Begin Editing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Start by letting Lulu analyze your manuscript to recommend a professional editing workflow.
      </p>
      <button
        onClick={handleStartClick}
        disabled={!manuscriptText || manuscriptText.trim().length === 0}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Analyze Manuscript
      </button>
    </div>
  );
}