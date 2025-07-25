// /components/EditorialPlanner.jsx
"use client";

import React, { useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';

// This is the new, primary component for our "Pre-Flight Briefing".
export default function EditorialPlanner({ manuscriptText }) {
  // Connect to the "Mind" for state
  const { state } = useWorkflow();
  const { isProcessing, editorialPlan, error } = state;

  // Connect to the "Will" for actions
  const actions = useWorkflowActions();

  // Local state for the writer's notes input
  const [writerNotes, setWriterNotes] = useState('');

  // --- UPDATED: This handler now calls the action from our "Will" ---
  const handlePreparePlan = () => {
    actions.prepareEditorialPlan(writerNotes, manuscriptText);
  };

  // --- Render logic for the multi-stage panel ---

  // Stage 3: The interactive checklist is ready for review
  if (editorialPlan) {
    return (
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Your Editorial Plan</h3>
        <p className="text-sm text-gray-600 mb-4">Please review and approve the goals for this editing session.</p>
        
        {/* The new, intelligent checklist UI */}
        <div className="space-y-3 border p-4 rounded-lg bg-gray-50/50">
          {editorialPlan.map(item => (
            <label key={item.id} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border has-[:checked]:border-purple-400 has-[:checked]:bg-purple-50 transition-all">
              <input
                type="checkbox"
                defaultChecked={item.isSelected}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.source === 'Writer' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {item.source}
                </span>
                <p className="text-sm text-gray-700 mt-1">{item.goal}</p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={() => actions.executeApprovedPlan('pro')}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Generate Edits for This Plan
        </button>
      </div>
    );
  }

  // Stage 2: The plan is being synthesised by the AI
  if (isProcessing) {
    return (
      <div className="p-4 text-center">
        <p className="text-lg font-semibold animate-pulse text-purple-700">Consulting with Lulu...</p>
        <p className="text-sm text-gray-500 mt-2">Lulu is synthesising your notes with her own analysis.</p>
      </div>
    );
  }

  // Stage 1: The initial view, for gathering the writer's intent
  return (
    <div className="p-4">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Pre-Flight Briefing</h3>
      <p className="text-sm text-gray-600 mb-4">
        Provide any specific notes or goals for this editing session below.
      </p>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">📝 Your Notes for Lulu</label>
        <textarea
          value={writerNotes}
          onChange={(e) => setWriterNotes(e.target.value)}
          className="w-full p-2 border rounded text-sm"
          rows={5}
          placeholder="e.g., Change character name from John to David. Remove the coffee shop scene. Make the dialogue snappier..."
        />
      </div>

      <button
        onClick={handlePreparePlan}
        disabled={!manuscriptText || manuscriptText.trim().length < 10}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
      >
        Consult with Lulu
      </button>
    </div>
  );
}