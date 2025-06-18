// /components/ProgressTracker.jsx
// VISUAL PROGRESS TRACKING: Edit level indicators, completion percentages, workflow navigation

import React, { useState, useEffect } from 'react';
import { getEditMeta } from '../utils/editorConfig';

// Progress calculation helpers
const calculateLevelProgress = (suggestions, editType) => {
  if (!suggestions || suggestions.length === 0) return { total: 0, completed: 0, percentage: 0 };
  
  const completed = suggestions.filter(s => 
    ['accepted', 'rejected', 'revised'].includes(s.state)
  ).length;
  
  return {
    total: suggestions.length,
    completed,
    percentage: Math.round((completed / suggestions.length) * 100)
  };
};

const calculateOverallProgress = (allSuggestions) => {
  let totalEdits = 0;
  let completedEdits = 0;
  
  Object.values(allSuggestions).forEach(suggestions => {
    if (Array.isArray(suggestions)) {
      totalEdits += suggestions.length;
      completedEdits += suggestions.filter(s => 
        ['accepted', 'rejected', 'revised'].includes(s.state)
      ).length;
    }
  });
  
  return {
    total: totalEdits,
    completed: completedEdits,
    percentage: totalEdits > 0 ? Math.round((completedEdits / totalEdits) * 100) : 0
  };
};

// Individual level progress indicator
function LevelProgressIndicator({ 
  editType, 
  suggestions = [], 
  isActive = false, 
  isCompleted = false,
  hasPendingCascades = false,
  onClick = () => {}
}) {
  const meta = getEditMeta(editType);
  const progress = calculateLevelProgress(suggestions, editType);
  
  const baseClasses = "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer";
  const activeClasses = isActive ? "bg-purple-50 border-purple-300 shadow-md" : "bg-gray-50 border-gray-200 hover:bg-gray-100";
  const completedClasses = isCompleted ? "bg-green-50 border-green-300" : "";
  
  return (
    <div 
      className={`${baseClasses} ${activeClasses} ${completedClasses}`}
      onClick={() => onClick(editType)}
    >
      {/* Edit type icon and name */}
      <div className="flex items-center gap-2 flex-1">
        <span className={`text-xl ${meta?.iconColor || 'text-gray-500'}`}>
          {meta?.icon || '📝'}
        </span>
        <div>
          <div className="font-semibold text-sm">{editType}</div>
          <div className="text-xs text-gray-500">
            {progress.total > 0 ? `${progress.completed}/${progress.total} edits` : 'No edits'}
          </div>
        </div>
      </div>
      
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {hasPendingCascades && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-yellow-600">Cascading</span>
          </div>
        )}
        
        {progress.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-12 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-700">
              {progress.percentage}%
            </span>
          </div>
        )}
        
        {isCompleted && (
          <div className="flex items-center">
            <span className="text-green-600 text-lg">✅</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Workflow phase navigator
function WorkflowNavigator({ 
  currentWorkflow = 'pro',
  currentPhase = 'assessment',
  phases = [],
  onPhaseClick = () => {}
}) {
  const phaseDisplayNames = {
    assessment: 'Assessment',
    general: 'General Review',
    developmental: 'Developmental',
    structural: 'Structural', 
    line: 'Line Editing',
    copy: 'Copy Editing',
    proof: 'Proofreading',
    complete: 'Complete',
    recommendations: 'Recommendations'
  };
  
  const currentIndex = phases.indexOf(currentPhase);
  
  return (
    <div className="bg-white border rounded-lg p-4 mb-6">
      <h3 className="font-bold text-lg text-gray-800 mb-3">
        📋 {currentWorkflow.charAt(0).toUpperCase() + currentWorkflow.slice(1)} Edit Workflow
      </h3>
      
      <div className="flex items-center gap-2 overflow-x-auto">
        {phases.map((phase, index) => {
          const isCurrentPhase = phase === currentPhase;
          const isCompleted = index < currentIndex;
          const isAccessible = index <= currentIndex; // Can click current or previous phases
          
          return (
            <React.Fragment key={phase}>
              <div 
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isCurrentPhase ? 'bg-purple-100 text-purple-800 border border-purple-300' : ''}
                  ${isCompleted ? 'bg-green-100 text-green-800' : ''}
                  ${!isCurrentPhase && !isCompleted ? 'bg-gray-100 text-gray-500' : ''}
                  ${isAccessible ? 'cursor-pointer hover:shadow-sm' : 'cursor-not-allowed opacity-50'}
                `}
                onClick={() => isAccessible && onPhaseClick(phase)}
              >
                <span className="text-base">
                  {isCompleted ? '✅' : isCurrentPhase ? '🔄' : '⏳'}
                </span>
                <span className="whitespace-nowrap">
                  {phaseDisplayNames[phase] || phase}
                </span>
              </div>
              
              {index < phases.length - 1 && (
                <div className="flex items-center">
                  <div className={`w-8 h-0.5 ${index < currentIndex ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                  <span className="text-gray-400 mx-1">▶</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Main progress tracker component
export default function ProgressTracker({
  // Workflow state
  currentWorkflow = 'pro',
  currentPhase = 'assessment', 
  workflowPhases = [],
  
  // Editing data
  suggestions = {},
  specificEdits = [],
  writerEdits = [],
  
  // Cascade state
  pendingCascades = [],
  recontextualizing = false,
  completedLevels = [],
  
  // Authenticity tracking
  authorship = { user: 100, lulu: 0 },
  
  // UI handlers
  onPhaseClick = () => {},
  onLevelClick = () => {},
  
  // Display options
  showWorkflowNav = true,
  showLevelProgress = true,
  showAuthenticity = true,
  compact = false
}) {

  // Calculate overall progress
  const overallProgress = calculateOverallProgress({
    ...suggestions,
    specific: specificEdits,
    writer: writerEdits
  });

  // Get all edit levels present in current session
  const editLevels = [
    'Developmental',
    'Structural', 
    'Line',
    'Copy',
    'Proof'
  ];

  // Get suggestions for each level
  const getLevelSuggestions = (level) => {
    if (level === 'General') {
      return Object.values(suggestions).flat();
    }
    
    // For specific edits, filter by editType
    return specificEdits.filter(edit => 
      edit.editType?.toLowerCase() === level.toLowerCase()
    );
  };

  // Check if level has pending cascades
  const levelHasPendingCascades = (level) => {
    return pendingCascades.some(cascade => 
      cascade.targetLevels.includes(level.toLowerCase())
    );
  };

  // Check if level is completed
  const isLevelCompleted = (level) => {
    return completedLevels.includes(level.toLowerCase());
  };

  if (compact) {
    // Compact view for smaller spaces
    return (
      <div className="bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">Progress</span>
          <span className="text-sm text-gray-600">{overallProgress.percentage}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress.percentage}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          {overallProgress.completed}/{overallProgress.total} edits completed
        </div>
        
        {recontextualizing && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-600">Recontextualizing...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workflow Phase Navigator */}
      {showWorkflowNav && workflowPhases.length > 0 && (
        <WorkflowNavigator
          currentWorkflow={currentWorkflow}
          currentPhase={currentPhase}
          phases={workflowPhases}
          onPhaseClick={onPhaseClick}
        />
      )}

      {/* Overall Progress Summary */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800">📊 Edit Progress</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{overallProgress.percentage}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress.percentage}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{overallProgress.completed} of {overallProgress.total} edits processed</span>
          {recontextualizing && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-600">Recontextualizing suggestions...</span>
            </div>
          )}
        </div>
      </div>

      {/* Individual Level Progress */}
      {showLevelProgress && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold text-lg text-gray-800 mb-3">📝 Edit Levels</h3>
          
          <div className="space-y-2">
            {editLevels.map(level => {
              const levelSuggestions = getLevelSuggestions(level);
              const hasPendingCascades = levelHasPendingCascades(level);
              const isCompleted = isLevelCompleted(level);
              const isActive = currentPhase === level.toLowerCase();
              
              return (
                <LevelProgressIndicator
                  key={level}
                  editType={level}
                  suggestions={levelSuggestions}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  hasPendingCascades={hasPendingCascades}
                  onClick={onLevelClick}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Authenticity Meter */}
      {showAuthenticity && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-bold text-lg text-gray-800 mb-3">👤 Authenticity Meter</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Your Voice</span>
              <span className="font-bold text-purple-600">{authorship.user}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${authorship.user}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-600">🙋‍♀️ You: {authorship.user}%</span>
              <span className="text-blue-600">🤖 Lulu: {authorship.lulu}%</span>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Authenticity preserved through thoughtful collaboration
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export individual components for flexible use
export { LevelProgressIndicator, WorkflowNavigator };