"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

/**
 * A self-contained, interactive card for resolving a single high-level edit.
 * It displays the main goal and then renders the specific, actionable edits for the user
 * to accept or reject one by one. This is "The Dynamic Workbench".
 * @param {{
 * goal: { id: string, text: string, why: string },
 * edits: Array<{ original: string, suggestion: string, why: string, severity: string }>,
 * isLoading: boolean,
 * onComplete: () => void
 * }} props
 */
export default function StrategyCard({ goal, edits = [], isLoading, onComplete }) {
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
        {edits.length > 0 ? (
          edits.map((edit, index) => (
            <SpecificEditCard
              key={index}
              edit={edit}
              index={index}
              onResolve={handleEditResolved}
              isResolved={resolvedEdits.has(index)}
            />
          ))
        ) : (
          <div className="text-center py-6">
             <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto" />
             <p className="mt-2 text-sm text-gray-600 font-medium">No specific edits needed for this goal.</p>
             <p className="text-xs text-gray-500">The AI determined your writing already achieves this objective.</p>
          </div>
        )}
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

/**
 * A single, interactive card for one specific edit (Line, Copy, etc.).
 * It presents the change clearly and allows the user to accept or reject.
 */
function SpecificEditCard({ edit, index, onResolve, isResolved }) {
  if (isResolved) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 text-green-800 border border-green-200 rounded-md transition-all">
        <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
        <span className="text-sm font-medium">Suggestion resolved.</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm animate-fade-in-up">
      <p className="text-xs font-semibold text-purple-700">{edit.severity === 'Critical' ? 'Critical Edit' : 'Suggested Edit'}</p>
      <div className="my-2 text-sm space-y-1">
        <p><span className="font-bold text-red-600 line-through decoration-2">{edit.original}</span></p> 
        <p><span className="font-bold text-green-600">{edit.suggestion}</span></p>
      </div>
      <p className="text-xs text-gray-600 italic">"{edit.why}"</p>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onResolve(index)} className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200">Accept</button>
        <button onClick={() => onResolve(index)} className="text-xs font-semibold bg-red-100 text-red-800 px-3 py-1 rounded-full hover:bg-red-200">Reject</button>
      </div>
    </div>
  );
}

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