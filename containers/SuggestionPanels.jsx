// /containers/SuggestionPanels.jsx
// SUGGESTION PANELS CONTAINER: Orchestrates General and Specific panels with learning log

import React from 'react';
import GeneralEditsPanel from '../components/GeneralEditsPanel';
import SpecificEditsPanel from '../components/SpecificEditsPanel';
import { getEditMeta } from '../utils/editorConfig';

export default function SuggestionPanels({
  // Mode and display
  mode = 'General Edits',
  showEditOptions = false,
  
  // General Edits props
  groupedSuggestions = {},
  writerEdits = [],
  onApply,
  
  // Specific Edits props
  specificEdits = [],
  
  // Deep dive props
  expandedSuggestions = {},
  deepDiveContent = {},
  deepDiveLoading = {},
  askLuluLogs = {},
  askLuluInputs = {},
  onToggleDeepDive,
  onAskLuluInput,
  onAskLuluSubmit,
  
  // Action handlers
  onAcceptWriter,
  onRejectWriter,
  onReviseWriter,
  onAccept,
  onReject,
  onRevise,
  onAcceptSpecific,
  onRejectSpecific,
  onReviseSpecific,
  onUndo,
  onStartRevise,
  onSaveRevise,
  onCancelRevise,
  onUndoHistory,
  onRedoHistory,
  
  // Revise state
  activeRevise = { type: null, idx: null, val: '' },
  setActiveRevise,
  
  // Cascade context
  currentWorkflow = 'pro',
  currentPhase = 'general',
  isProcessingCascade = false,
  pendingCascades = [],
  recontextualizing = false,
  
  // Learning log
  sessionLog = [],
  logAccordion = false,
  onToggleLogAccordion,
  
  // Styling and layout
  className = "",
  showLearningLog = true,
  compact = false
}) {

  // Don't render if in edit options mode
  if (showEditOptions) {
    return null;
  }

  // Panel container styling
  const panelsClass = `space-y-6 ${className}`;

  return (
    <div className={panelsClass}>
      {/* General Edits Panel */}
      {mode === "General Edits" && (
        <GeneralEditsPanel
          groupedSuggestions={groupedSuggestions}
          writerEdits={writerEdits}
          onApply={onApply}
          expandedSuggestions={expandedSuggestions}
          deepDiveContent={deepDiveContent}
          deepDiveLoading={deepDiveLoading}
          askLuluLogs={askLuluLogs}
          askLuluInputs={askLuluInputs}
          onToggleDeepDive={onToggleDeepDive}
          onAskLuluInput={onAskLuluInput}
          onAskLuluSubmit={onAskLuluSubmit}
          onAcceptWriter={onAcceptWriter}
          onRejectWriter={onRejectWriter}
          onReviseWriter={onReviseWriter}
          onAccept={onAccept}
          onReject={onReject}
          onRevise={onRevise}
          onUndo={onUndo}
          onStartRevise={onStartRevise}
          onSaveRevise={onSaveRevise}
          onCancelRevise={onCancelRevise}
          activeRevise={activeRevise}
          setActiveRevise={setActiveRevise}
          getEditMeta={getEditMeta}
          // Cascade context
          currentWorkflow={currentWorkflow}
          currentPhase={currentPhase}
          isProcessingCascade={isProcessingCascade}
        />
      )}

      {/* Specific Edits Panel */}
      {mode === "Specific Edits" && (
        <SpecificEditsPanel
          suggestions={specificEdits}
          onAccept={onAcceptSpecific}
          onReject={onRejectSpecific}
          onRevise={onReviseSpecific}
          onStartRevise={onStartRevise}
          onSaveRevise={onSaveRevise}
          onCancelRevise={onCancelRevise}
          expandedSuggestions={expandedSuggestions}
          deepDiveContent={deepDiveContent}
          deepDiveLoading={deepDiveLoading}
          askLuluLogs={askLuluLogs}
          askLuluInputs={askLuluInputs}
          onToggleDeepDive={onToggleDeepDive}
          onAskLuluInput={onAskLuluInput}
          onAskLuluSubmit={onAskLuluSubmit}
          activeRevise={activeRevise}
          setActiveRevise={setActiveRevise}
          getEditMeta={getEditMeta}
          onUndoHistory={onUndoHistory}
          onRedoHistory={onRedoHistory}
          // Cascade context
          currentWorkflow={currentWorkflow}
          currentPhase={currentPhase}
          isProcessingCascade={isProcessingCascade}
          pendingCascades={pendingCascades}
          recontextualizing={recontextualizing}
        />
      )}

      {/* Learning Log */}
      {showLearningLog && (
        <LearningLog
          sessionLog={sessionLog}
          logAccordion={logAccordion}
          onToggleLogAccordion={onToggleLogAccordion}
          compact={compact}
        />
      )}
    </div>
  );
}

// Learning Log Component
function LearningLog({ 
  sessionLog = [], 
  logAccordion = false, 
  onToggleLogAccordion,
  compact = false 
}) {
  
  // Calculate session statistics
  const getSessionStats = () => {
    const actionCounts = {};
    sessionLog.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    });
    
    return {
      total: sessionLog.length,
      actions: actionCounts,
      mostCommon: Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]
    };
  };

  const stats = getSessionStats();

  return (
    <div className="rounded bg-purple-50 border border-purple-200">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-purple-100 transition-colors rounded-lg"
        onClick={onToggleLogAccordion}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-purple-700 mb-0">🪄 Learning Log</h3>
          {stats.total > 0 && (
            <span className="bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {stats.total} actions
            </span>
          )}
        </div>
        <span className="text-purple-600 font-bold">
          {logAccordion ? '▲' : '▼'}
        </span>
      </div>
      
      {logAccordion && (
        <div className="px-3 pb-3">
          {sessionLog.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4 italic">
              As you accept, reject, or revise suggestions, your learning progress will appear here.
              
              <div className="mt-2 text-xs">
                💡 Tip: Each action helps Lulu understand your editing preferences!
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Session Summary */}
              {!compact && stats.total > 3 && (
                <div className="bg-white rounded p-3 border border-purple-200">
                  <div className="text-sm font-medium text-purple-700 mb-2">📊 Session Summary</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">Total Actions:</span>
                      <span className="font-medium ml-1">{stats.total}</span>
                    </div>
                    {stats.mostCommon && (
                      <div>
                        <span className="text-gray-600">Most Frequent:</span>
                        <span className="font-medium ml-1">{stats.mostCommon[0]} ({stats.mostCommon[1]})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Log */}
              <div className="bg-white rounded p-3 border border-purple-200 max-h-64 overflow-y-auto">
                <ul className="space-y-2 text-sm">
                  {sessionLog.slice().reverse().map((entry, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActionIcon(entry.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.action === 'Ask Lulu' ? (
                          <>
                            <div className="font-medium text-blue-600">Ask Lulu:</div>
                            <div className="text-gray-700 truncate">{entry.context}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-gray-800">{entry.action}:</div>
                            <div className="text-gray-600 text-xs truncate">{entry.context}</div>
                          </>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-400">
                        {entry.ts && formatTime(entry.ts)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to get action icons
function getActionIcon(action) {
  const icons = {
    'WriterEdit': '✏️',
    'Suggestion': '💡',
    'Ask Lulu': '❓',
    'Cascade Generated': '🔄',
    'Workflow Complete': '🎉',
    'reject': '❌',
    'accept': '✅',
    'revise': '📝'
  };
  
  return icons[action] || '📝';
}

// Helper function to format timestamps
function formatTime(timestamp) {
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  return '';
}

// Progress Summary Component (can be used separately)
export function ProgressSummary({
  totalSuggestions = 0,
  editsProcessed = 0,
  authorship = { user: 100, lulu: 0 },
  currentWorkflow = 'pro',
  currentPhase = 'general',
  className = ""
}) {
  
  const progressPercentage = totalSuggestions > 0 
    ? Math.round((editsProcessed / totalSuggestions) * 100) 
    : 0;
  
  const isComplete = totalSuggestions > 0 && editsProcessed === totalSuggestions;

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">📈 Session Progress</h3>
        <div className="text-sm text-gray-600">
          {currentWorkflow.charAt(0).toUpperCase() + currentWorkflow.slice(1)} Edit
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>Edits Processed</span>
          <span className="font-medium">{editsProcessed}/{totalSuggestions}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Status */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span className="text-gray-600">
            {isComplete ? 'Complete!' : `${currentPhase} Phase`}
          </span>
        </div>
        <div className="text-purple-600 font-medium">
          {progressPercentage}%
        </div>
      </div>
      
      {isComplete && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
          <div className="text-green-700 font-medium text-sm">
            🎉 Great work! Your manuscript has been professionally edited.
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal panels version for smaller spaces
export function MinimalSuggestionPanels(props) {
  return (
    <SuggestionPanels 
      {...props} 
      compact={true}
      showLearningLog={false}
      className="space-y-4"
    />
  );
}

// Panel selector for different modes
export function PanelSelector({ 
  mode, 
  onModeChange, 
  totalGeneral = 0, 
  totalSpecific = 0,
  className = "" 
}) {
  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-100 rounded-lg ${className}`}>
      <button
        onClick={() => onModeChange('General Edits')}
        className={`
          px-3 py-2 rounded text-sm font-medium transition-colors
          ${mode === 'General Edits' 
            ? 'bg-white text-purple-600 shadow-sm' 
            : 'text-gray-600 hover:text-gray-800'
          }
        `}
      >
        General ({totalGeneral})
      </button>
      
      <button
        onClick={() => onModeChange('Specific Edits')}
        className={`
          px-3 py-2 rounded text-sm font-medium transition-colors
          ${mode === 'Specific Edits' 
            ? 'bg-white text-purple-600 shadow-sm' 
            : 'text-gray-600 hover:text-gray-800'
          }
        `}
      >
        Specific ({totalSpecific})
      </button>
    </div>
  );
}

// Export all components
export { LearningLog, getActionIcon, formatTime };