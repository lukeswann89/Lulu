"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import SpecificEditCard from './SpecificEditCard';

/**
 * A self-contained, interactive card for resolving a single high-level edit.
 * It displays the main goal and then renders the specific, actionable edits for the user
 * to accept or reject one by one. This is "The Dynamic Workbench".
 * 
 * TASK 3 FIX: Updated to use canonical SpecificEditCard component for consistency
 * 
 * @param {{
 * goal: { id: string, text: string, why: string },
 * edits: Array<{ original: string, suggestion: string, why: string, severity: string }>,
 * isLoading: boolean,
 * onComplete: () => void,
 * onAcceptChoice: (suggestionId, suggestion) => void,
 * getEditMeta: (type) => object
 * }} props
 */
export default function StrategyCard({ 
    goal, 
    edits = [], 
    isLoading, 
    onComplete, 
    onAcceptChoice,
    getEditMeta 
}) {
  // --- Internal State ---
  // Tracks the indices of edits that have been resolved (accepted or rejected).
  const [resolvedEdits, setResolvedEdits] = useState(new Set());
  const allEditsResolved = edits.length > 0 && resolvedEdits.size === edits.length;

  // --- Logic ---
  // When a child edit card is resolved, add its index to our set.
  const handleEditResolved = (index) => {
    setResolvedEdits(prev => new Set(prev).add(index));
  };

  // --- Effect ---
  // When a new goal/set of edits is passed in, reset the local state.
  useEffect(() => {
    setResolvedEdits(new Set());
  }, [goal.id]); // Reset whenever the goal ID changes.

  // --- Rendering ---
  // Display a loading skeleton while the "New Intelligence" is working.
  if (isLoading) {
    return <StrategyCardSkeleton />;
  }

  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg p-6 shadow-lg mb-4 animate-fade-in">

      {/* 1. The High-Level Goal */}
      <div className="border-b border-gray-200 pb-4">
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-800">
          Substantive Goal
        </span>
        <h3 className="text-xl font-bold text-gray-900 mt-2">{goal.text}</h3>
        <p className="text-sm text-gray-600 mt-1">{goal.why}</p>
      </div>

      {/* 2. The Workbench: Interactive Edit Cards */}
      <div className="mt-4 space-y-3">
        {/* Guard clause: Only render SpecificEditCard when edits are loaded */}
        {/* Guard clause: Only render SpecificEditCard when edits are loaded */}
        {edits && edits.length > 0
          ? edits.map((edit, index) => (
              <SpecificEditCard
                key={index}
                edit={edit}
                index={index}
                onAccept={(suggestionId, suggestion) => {
                  if (onAcceptChoice) {
                    onAcceptChoice(suggestionId, suggestion);
                  }
                  handleEditResolved(index);
                }}
                onReject={() => handleEditResolved(index)}
                onRevise={() => handleEditResolved(index)}
                getEditMeta={getEditMeta}
                isResolved={resolvedEdits.has(index)}
              />
            ))
          : (
              <div className="text-center py-6">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto" />
                <p className="mt-2 text-sm text-gray-600 font-medium">No specific edits needed for this goal.</p>
                <p className="text-xs text-gray-500">The AI determined your writing already achieves this objective.</p>
              </div>
            )
        }
      </div>

      {/* 3. The "Resolve to Proceed" Action */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onComplete}
          disabled={!allEditsResolved && edits.length > 0}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-all ease-in-out duration-200 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          {allEditsResolved || edits.length === 0 ? 'Proceed to Next Goal' : 'Complete All Edits to Proceed'}
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// TASK 3 FIX: Removed local SpecificEditCard - now uses canonical component

/**
 * A loading skeleton to display while fetching edits.
 * This preserves the user's flow state and manages expectations.
 */
function StrategyCardSkeleton() {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-lg mb-4 animate-pulse">
       <div className="h-3 bg-gray-200 rounded-full w-1/4 mb-4"></div>
       <div className="h-6 bg-gray-300 rounded-md w-3/4 mb-2"></div>
       <div className="h-4 bg-gray-200 rounded-md w-full mb-6"></div>
       <div className="border-t border-gray-200 pt-4 space-y-3">
         <div className="h-16 bg-gray-100 rounded-lg"></div>
         <div className="h-16 bg-gray-100 rounded-lg"></div>
       </div>
       <div className="mt-6 pt-4 border-t border-gray-200">
         <div className="h-12 bg-gray-300 rounded-lg"></div>
       </div>
    </div>
  );
} 