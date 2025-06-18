import React from 'react'

// Helper function to generate short title from suggestion text
function generateShortTitle(text) {
  if (!text) return 'Untitled Suggestion';
  
  // Remove quotes and clean up text
  const cleanText = text.replace(/^["']|["']$/g, '').trim();
  
  // Split into words and take first 3-7 words
  const words = cleanText.split(/\s+/);
  const shortTitle = words.slice(0, Math.min(7, words.length)).join(' ');
  
  // Add ellipsis if truncated
  return words.length > 7 ? `${shortTitle}...` : shortTitle;
}

// Helper function to get short why (first ~15 words)
function getShortWhy(why) {
  if (!why) return '';
  
  const words = why.split(/\s+/);
  if (words.length <= 15) return why;
  
  return words.slice(0, 15).join(' ') + '...';
}

// Unified SuggestionCard for both General and Specific Edits
export default function SuggestionCard({
  sug,
  idx,
  groupType,
  meta,
  sKey,
  collapsed,
  expanded,
  deepDiveContent,
  deepDiveLoading,
  askLuluLogs,
  askLuluInputs,
  onToggleDeepDive,
  onAskLuluInput,
  onAskLuluSubmit,
  onAccept,
  onReject,
  onRevise,
  onUndo = () => {}, // Default no-op function
  onStartRevise,
  onSaveRevise,
  onCancelRevise,
  activeRevise,
  setActiveRevise,
  mode = "General Edits", // "General Edits" or "Specific Edits"
  priority = null, // For priority display on ALL cards
  selected = false, // For General Edits checkbox
  onToggleSelect = null, // For General Edits selection
  autoAdvance = null, // Function to auto-advance to next suggestion
}) {
  if (!sug) return null;

  // Determine display content based on mode
  const isSpecificMode = mode === "Specific Edits";
  const isWriterEdit = sug.isWriter;
  const mainText = isSpecificMode 
    ? sug.suggestion 
    : (isWriterEdit ? (sug.lulu || sug.own) : sug.recommendation);

  // Generate or use provided title
  const cardTitle = sug.title || generateShortTitle(mainText);
  
  // Get short version of why for main card
  const shortWhy = getShortWhy(sug.why);
  
  // Priority styling for ALL cards
  const priorityColors = {
    High: { text: 'text-red-600', bg: 'bg-red-100', icon: '🔴' },
    Medium: { text: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' },
    Low: { text: 'text-gray-500', bg: 'bg-gray-100', icon: '⚪' }
  };

  const priorityStyle = priority || sug.priority ? priorityColors[priority || sug.priority] : null;

  // Handle actions with auto-advance
  const handleAccept = (...args) => {
    onAccept(...args);
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  const handleReject = (...args) => {
    onReject(...args);
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  const handleRevise = (...args) => {
    onRevise(...args);
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  // If collapsed, show minimal view
  if (collapsed) {
    return (
      <div className={`border rounded p-3 mb-2 bg-gray-50 opacity-75`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {priorityStyle && (
              <span className={priorityStyle.text} title={`${priority || sug.priority} Priority`}>
                {priorityStyle.icon}
              </span>
            )}
            <span className="font-bold text-sm">{cardTitle}</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              {sug.state.charAt(0).toUpperCase() + sug.state.slice(1)}
            </span>
          </div>
          <button 
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs border border-purple-300 hover:bg-purple-200"
            onClick={() => onUndo(idx, groupType)}
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded p-3 mb-2 ${meta?.color || 'bg-gray-50'}`}>
      {/* General Edits: Checkbox Selection */}
      <div className="flex gap-2">
        {!isSpecificMode && onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(sKey)}
            className="mt-1 flex-shrink-0"
          />
        )}
        
        <div className="flex-1">
          {/* Header with Priority, Icon, and Title */}
          <div className="flex items-center gap-2 mb-3">
            {priorityStyle && (
              <span className={priorityStyle.text} title={`${priority || sug.priority} Priority`}>
                {priorityStyle.icon}
              </span>
            )}
            <span className={`text-lg ${meta?.iconColor || 'text-gray-600'}`}>{meta?.icon || '✏️'}</span>
            <span className="font-bold text-base">{cardTitle}</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded ml-auto">
              {groupType}
            </span>
          </div>

          {/* Original Text (Specific Edits Only) */}
          {isSpecificMode && sug.original && (
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700">Original: </span>
              <span className="text-sm text-red-700 bg-red-50 px-1 rounded">"{sug.original}"</span>
            </div>
          )}

          {/* Suggestion Text */}
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">
              {isSpecificMode ? 'Suggestion: ' : (isWriterEdit ? 'Lulu\'s Edit: ' : 'Suggestion: ')}
            </span>
            <span className="text-sm text-blue-700">{mainText}</span>
          </div>

          {/* Short Why (first ~15 words only) */}
          {shortWhy && (
            <div className="text-sm text-purple-700 italic mb-3">
              <span className="font-medium">Why: </span>{shortWhy}
            </div>
          )}

          {/* Action Buttons and Deep Dive */}
          <div>
            {/* Action Buttons (only show if not collapsed) */}
            <div className="flex gap-2 mb-2">
              {isWriterEdit ? (
                <>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleAccept(sug.idx, 'accepted')}>Keep Own</button>
                  <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
  onClick={() => handleAccept(idx)}>Accept</button>
<button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
  onClick={() => handleReject(idx)}>Reject</button>
                  <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
  onClick={() => onStartRevise(idx)}>Revise</button>
                </>
              ) : (
                <>
                  <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleAccept(idx, 'accepted')}>Accept</button>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleReject(idx, 'rejected')}>Reject</button>
                  <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                    onClick={() => onStartRevise(sug.type || groupType, idx, sug.suggestion || sug.recommendation)}>Revise</button>
                </>
              )}
            </div>

            {/* Deep Dive Button */}
            <button
              className="text-xs px-2 py-1 bg-purple-100 rounded text-purple-800 hover:bg-purple-200"
              onClick={() => onToggleDeepDive(sKey, sug, groupType)}
            >
              {expanded ? '- Deep Dive' : '+ Deep Dive'}
            </button>
          </div>

          {/* Revise Form */}
          {activeRevise?.type === (isWriterEdit ? 'writer' : (sug.type || groupType)) && activeRevise?.idx === idx && (
            <div className="mt-3">
              <textarea
                className="w-full p-2 border rounded text-sm"
                rows={2}
                value={activeRevise.val}
                onChange={e => setActiveRevise(r => ({ ...r, val: e.target.value }))}
                placeholder="Enter your revision..."
              />
              <div className="flex gap-2 mt-2">
                <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => {
                    onSaveRevise(sug.type || groupType, idx, activeRevise.val, isWriterEdit);
                    if (autoAdvance) {
                      setTimeout(() => autoAdvance(), 250);
                    }
                  }}>Save</button>
                <button className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                  onClick={onCancelRevise}>Cancel</button>
              </div>
            </div>
          )}

          {/* Deep Dive Expanded Content */}
          {expanded && (
            <div className="mt-3 pl-3 border-l-4 border-purple-200 bg-purple-50 rounded p-3">
              <div className="text-sm text-purple-800 font-semibold mb-2">🧠 Mentor Insight</div>
              
              {/* Full Why in Deep Dive */}
              {sug.why && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-purple-700">Full Context: </span>
                  <span className="text-sm text-purple-800">{sug.why}</span>
                </div>
              )}

              {/* Principles in Deep Dive Only */}
              {sug.principles?.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-blue-700">Writing Principles: </span>
                  <span className="text-sm text-blue-800">{sug.principles.join(', ')}</span>
                </div>
              )}

              {/* Mentor Insight Content */}
              <div className="mb-3 p-2 bg-white rounded border">
                {deepDiveLoading
                  ? <span className="italic text-gray-500">🔄 Loading mentor insight...</span>
                  : <span className="text-sm text-gray-800">{deepDiveContent || "Click + Deep Dive to get mentor insight."}</span>
                }
              </div>

              {/* Ask Lulu Chat Log */}
              <div className="mb-2">
                <div className="text-sm font-medium text-purple-700 mb-1">💬 Ask Lulu</div>
                {(askLuluLogs || []).map((msg, i) => (
                  <div key={i} className={msg.who === 'user'
                    ? "text-xs text-gray-800 bg-gray-100 rounded p-2 mb-1"
                    : "text-xs text-blue-700 bg-blue-100 rounded p-2 mb-1"}>
                    <b>{msg.who === "user" ? "You: " : "Lulu: "}</b>{msg.text}
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    className="flex-1 p-1 border rounded text-sm"
                    value={askLuluInputs || ""}
                    onChange={e => onAskLuluInput(sKey, e.target.value)}
                    placeholder="Ask Lulu about this suggestion..."
                    onKeyDown={e => { if (e.key === "Enter") onAskLuluSubmit(sKey, sug, groupType) }}
                  />
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                    onClick={() => onAskLuluSubmit(sKey, sug, groupType)}
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}