// /containers/EditingWorkspace.jsx
// EDITING WORKSPACE CONTAINER: Left panel with manuscript editor and authorship meter

import React from 'react';
import ProseMirrorEditor from '../components/ProseMirrorEditor';

// Authorship Meter Component - Moved to top to avoid hoisting issues
function AuthorshipMeter({ authorship }) {
  const getAuthorshipGradient = () => {
    const userPercentage = authorship.user;
    return {
      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${userPercentage}%, #3b82f6 ${userPercentage}%, #3b82f6 100%)`
    };
  };

  const getAuthorshipMessage = () => {
    if (authorship.user >= 80) {
      return "Your voice dominates - great authenticity! 🎯";
    } else if (authorship.user >= 60) {
      return "Balanced collaboration with your voice leading 📝";
    } else if (authorship.user >= 40) {
      return "Collaborative editing - finding the right balance ⚖️";
    } else {
      return "Lulu's suggestions are helping shape the text 🤖";
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">👤 Authorship Meter</h3>
        <div className="text-sm text-gray-600">
          Authenticity Score: <span className="font-semibold text-purple-600">{authorship.user}%</span>
        </div>
      </div>
      
      {/* Visual meter bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-4 rounded-full transition-all duration-500"
            style={getAuthorshipGradient()}
          ></div>
        </div>
      </div>
      
      {/* Percentage breakdown */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="font-medium">Your Voice: {authorship.user}%</span>
        </span>
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="font-medium">Lulu's Help: {authorship.lulu}%</span>
        </span>
      </div>
      
      {/* Dynamic message */}
      <div className="text-xs text-gray-600 text-center italic">
        {getAuthorshipMessage()}
      </div>
    </div>
  );
}

// Main EditingWorkspace Component
export default function EditingWorkspace({
  // Editor props
  proseMirrorRef,
  text,
  setText,
  specificEdits = [],
  onAcceptSpecific,
  onRejectSpecific,
  onReviseSpecific,
  showHighlights = true,
  mode = 'General Edits',
  
  // Authorship props
  authorship = { user: 100, lulu: 0 },
  showEditOptions = true,
  
  // Debug and styling
  debug = false,
  className = "",
  
  // Additional editor options
  editorOptions = {}
}) {

  // Default CSS classes for the workspace
  const workspaceClass = `flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit ${className}`;

  return (
    <div className={workspaceClass}>
      <label className="font-semibold block mb-1 text-lg">
        Your Manuscript
      </label>
      
      {/* Main ProseMirror Editor */}
      <ProseMirrorEditor
        ref={proseMirrorRef}
        value={text} 
        setValue={setText}
        specificEdits={mode === "Specific Edits" ? specificEdits : []}
        onAcceptSpecific={onAcceptSpecific}
        onRejectSpecific={onRejectSpecific} 
        onReviseSpecific={onReviseSpecific}
        showHighlights={showHighlights && mode === "Specific Edits"}
        debug={debug}
        {...editorOptions}
      />

      {/* Authorship Meter - Show for General Edits when not in options */}
      {!showEditOptions && mode === "General Edits" && (
        <div className="mt-6 mb-4">
          <AuthorshipMeter authorship={authorship} />
        </div>
      )}

      {/* Debug Info */}
      {debug && (
        <div className="mt-4 p-3 bg-gray-50 rounded border text-xs">
          <div className="font-semibold text-gray-700 mb-2">📊 Workspace Debug</div>
          <div className="space-y-1 text-gray-600">
            <div><strong>Mode:</strong> {mode}</div>
            <div><strong>Text Length:</strong> {text?.length || 0} chars</div>
            <div><strong>Specific Edits:</strong> {specificEdits?.length || 0}</div>
            <div><strong>Show Highlights:</strong> {showHighlights ? '✅' : '❌'}</div>
            <div><strong>Editor Ready:</strong> {proseMirrorRef?.current ? '✅' : '❌'}</div>
            <div><strong>Authorship:</strong> User {authorship.user}% | Lulu {authorship.lulu}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Workspace with Word Count and Statistics
export function EnhancedEditingWorkspace(props) {
  // ✅ FIXED: Destructure inside the function, not in parameters
  const {
    showWordCount = true,
    showReadingTime = true,
    showStatistics = false,
    sessionStats = null,
    text = '',
    ...baseProps  // ✅ This is valid inside the function body
  } = props;
  
  // Calculate text statistics
  const getTextStats = () => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    // Estimated reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(words.length / 200);
    const avgWordsPerSentence = sentences > 0 ? Math.round(words.length / sentences) : 0;
    const complexity = avgWordsPerSentence > 20 ? 'High' : avgWordsPerSentence > 15 ? 'Medium' : 'Low';
    
    return {
      words: words.length,
      characters,
      charactersNoSpaces,
      sentences,
      paragraphs,
      readingTimeMinutes,
      avgWordsPerSentence,
      complexity
    };
  };

  const stats = getTextStats();

  return (
    <div className="space-y-4">
      {/* Main Workspace */}
      <EditingWorkspace {...baseProps} />
      
      {/* Enhanced Statistics Panel */}
      {(showWordCount || showReadingTime || showStatistics) && (
        <div className="bg-white shadow rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            📊 Manuscript Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Basic Stats */}
            {showWordCount && (
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-600 text-lg">{stats.words.toLocaleString()}</div>
                <div className="text-blue-500">Words</div>
              </div>
            )}
            
            {showReadingTime && (
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-bold text-green-600 text-lg">{stats.readingTimeMinutes}</div>
                <div className="text-green-500">Min Read</div>
              </div>
            )}
            
            {showStatistics && (
              <>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-bold text-purple-600 text-lg">{stats.sentences}</div>
                  <div className="text-purple-500">Sentences</div>
                </div>
                
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-bold text-orange-600 text-lg">{stats.paragraphs}</div>
                  <div className="text-orange-500">Paragraphs</div>
                </div>
                
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-600 text-lg">{stats.avgWordsPerSentence}</div>
                  <div className="text-gray-500">Avg Words/Sentence</div>
                </div>
                
                <div className="text-center p-2 bg-indigo-50 rounded">
                  <div className="font-bold text-indigo-600 text-lg">{stats.charactersNoSpaces.toLocaleString()}</div>
                  <div className="text-indigo-500">Characters</div>
                </div>
                
                <div className="text-center p-2 bg-yellow-50 rounded col-span-2">
                  <div className="font-bold text-yellow-600 text-lg">{stats.complexity}</div>
                  <div className="text-yellow-500">Complexity Level</div>
                </div>
              </>
            )}
          </div>
          
          {/* Session Statistics */}
          {sessionStats && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Session Actions:</span>
                  <span className="font-medium">{sessionStats.totalActions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Session Duration:</span>
                  <span className="font-medium">
                    {sessionStats.sessionDuration > 0 
                      ? `${Math.round(sessionStats.sessionDuration / 60000)}m` 
                      : '0m'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export both versions
export { AuthorshipMeter };