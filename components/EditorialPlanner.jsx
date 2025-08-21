// /components/EditorialPlanner.jsx
"use client";

import React, { useState } from 'react';

/**
 * EditorialPlanner - Refactored to be fully compliant with "Three Pillars" architecture
 * 
 * CHANGES MADE:
 * - Removed direct useWorkflow() and useWorkflowActions() hook usage
 * - Now accepts editorialPlan, isProcessing, error, and actions as props
 * - Made component "dumb" - derives all display logic from props
 * - Maintains only local UI state (writerNotes) that doesn't conflict with global state
 * - FIXED: Added local state to track goal selection and filter goals before execution
 * 
 * Philosophy: This component is now purely controlled by its parent,
 * eliminating state synchronization conflicts with the global "Mind."
 */

export default function EditorialPlanner({ 
    manuscriptText, 
    editorialPlan, 
    isProcessing, 
    error, 
    actions 
}) {
    // Local state for the writer's notes input (UI-only state)
    const [writerNotes, setWriterNotes] = useState('');
    
    // Local state to track which goals are selected (TASK 1 FIX)
    const [selectedGoals, setSelectedGoals] = useState(() => {
        if (!editorialPlan) return {};
        const initial = {};
        editorialPlan.forEach(goal => {
            initial[goal.id] = goal.isSelected !== false; // Default to true unless explicitly false
        });
        return initial;
    });

    // Update selectedGoals when editorialPlan changes
    React.useEffect(() => {
        if (editorialPlan) {
            const updated = {};
            editorialPlan.forEach(goal => {
                updated[goal.id] = selectedGoals[goal.id] !== undefined 
                    ? selectedGoals[goal.id] 
                    : (goal.isSelected !== false);
            });
            setSelectedGoals(updated);
        }
    }, [editorialPlan]);

    // Handle checkbox changes
    const handleGoalToggle = (goalId) => {
        setSelectedGoals(prev => ({
            ...prev,
            [goalId]: !prev[goalId]
        }));
    };

    // Handle executing the approved plan with filtered goals
    const handleExecuteApprovedPlan = async () => {
        const filteredGoals = editorialPlan.filter(goal => selectedGoals[goal.id]);
        
        // Execute the workflow plan
        actions.executeApprovedPlan('pro', filteredGoals);
        
        // NEW: Fetch Deep Dive specific edits for the selected strategy cards
        if (filteredGoals.length > 0) {
            // Extract strategy card IDs from the selected goals
            const strategyCardIds = filteredGoals.map(goal => String(goal.id));
            
            // INSTRUMENTATION: Log the Deep Dive request details
            console.log('[DeepDive] phase', 'assessment');
            console.log('[DeepDive] selectedCards', strategyCardIds);
            console.log('[DeepDive] request body', {
                strategyCardIds,
                textLength: manuscriptText?.length || 0,
                intent: 'sentence_edits'
            });
            
            try {
                const suggestions = await actions.fetchDeepDiveEdits(strategyCardIds, manuscriptText);
                
                // INSTRUMENTATION: Log the response details
                console.log('[DeepDive] raw response suggestions', suggestions);
                console.log('[DeepDive] suggestions path check', {
                    atRoot: Array.isArray(suggestions),
                    count: suggestions?.length || 0,
                    first: suggestions?.[0]
                });
                
                // TODO: These suggestions should be passed to the parent component
                // to be displayed in the editor. For now, we'll just log them.
                // In the full implementation, this would update the global suggestion state.
            } catch (error) {
                console.error('[DeepDive] Error executing plan:', error);
            }
        }
    };

    // Handler calls the action from props (no direct hook usage)
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
                checked={selectedGoals[item.id] || false}
                onChange={() => handleGoalToggle(item.id)}
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
          onClick={handleExecuteApprovedPlan}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Generate Edits for This Plan ({Object.values(selectedGoals).filter(Boolean).length} selected)
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
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    );
  }