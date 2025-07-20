// /components/WorkflowTracker.jsx
"use client";

import React from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { useWorkflowActions } from '../hooks/useWorkflowActions';

export default function WorkflowTracker() {
  const { state } = useWorkflow();
  const { currentPhase, workflowPhases, completedPhases } = state;
  const actions = useWorkflowActions();

  // A map to give our phases professional, user-facing names
  const phaseDisplayNames = {
    assessment: 'Assessment',
    developmental: 'Developmental',
    structural: 'Structural',
    line: 'Line Edit',
    copy: 'Copy Edit',
    proof: 'Proofreading',
    complete: 'Complete',
  };

  const currentIndex = workflowPhases.indexOf(currentPhase);

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <h3 className="font-bold text-lg text-gray-800 mb-3">
        📋 Workflow Progress
      </h3>
      
      <div className="flex items-center gap-1 overflow-x-auto">
        {workflowPhases.map((phase, index) => {
          if (phase === 'assessment') return null;

          const isCurrentPhase = phase === currentPhase;
          const isCompleted = completedPhases.has(phase);
          const displayName = phaseDisplayNames[phase] || phase;
          
          return (
            <React.Fragment key={phase}>
              <div 
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCurrentPhase ? 'bg-purple-100 text-purple-800 border border-purple-300' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-800' : ''}
                  ${!isCurrentPhase && !isCompleted ? 'bg-gray-100 text-gray-500 opacity-60' : ''}
                `}
              >
                <span className="text-base">
                  {isCompleted ? '✅' : isCurrentPhase ? '▶️' : '🔵'}
                </span>
                <span className="whitespace-nowrap">
                  {displayName}
                </span>
              </div>
              
              {index < workflowPhases.length - 1 && phase !== 'complete' && (
                <div className={`h-0.5 flex-1 ${isCompleted || isCurrentPhase ? 'bg-purple-400' : 'bg-gray-300'}`}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}