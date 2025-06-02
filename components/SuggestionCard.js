import React from 'react'

// Unified SuggestionCard for both General and Specific Edits
// Handles different data structures with mode-aware display logic
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
  onUndo,
  onStartRevise,
  onSaveRevise,
  onCancelRevise,
  activeRevise,
  setActiveRevise,
  mode = "General Edits", // "General Edits" or "Specific Edits"
  priority = null, // For General Edits priority display
  selected = false, // For General Edits checkbox
  onToggleSelect = null, // For General Edits selection
}) {
  if (!sug) return null;

  // Determine display content based on mode
  const isSpecificMode = mode === "Specific Edits";
  const isWriterEdit = sug.isWriter;
  const showOriginalText = isSpecificMode && sug.original;
  const mainText = isSpecificMode 
    ? sug.suggestion 
    : (isWriterEdit ? (sug.lulu || sug.own) : sug.recommendation);

  // Priority styling for General Edits
  const priorityColors = {
    High: 'text-red-600',
    Medium: 'text-yellow-600',
    Low: 'text-gray-500'
  };

  return (
    <div key={sKey} className={`border rounded p-3 mb-2 ${meta?.color || 'bg-gray-50'}`}>
      {/* General Edits: Checkbox Selection */}
      {!isSpecificMode && onToggleSelect && (
        <label className="flex gap-2 items-start mb-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(sKey)}
          />
          <div className="flex-1">
            {/* Continue with content below */}
          </div>
        </label>
      )}

      {/* Header with Icon and Main Content */}
      <div className={`flex items-center mb-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
        <span className={`mr-2 text-lg ${meta?.iconColor || 'text-gray-600'}`}>{meta?.icon || '✏️'}</span>
        <div className="flex-1">
          {/* Priority for General Edits */}
          {!isSpecificMode && priority && (
            <span className={`font-medium ${priorityColors[priority] || 'text-gray-800'} mr-2`}>
              🔹 {priority} —
            </span>
          )}
          <span className="font-semibold">{mainText}</span>
        </div>
      </div>

      {/* Original Text (Specific Edits Only) */}
      {showOriginalText && (
        <div className={`mb-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <span className="text-sm font-medium text-gray-700">Original: </span>
          <span className="text-sm text-red-700 bg-red-50 px-1 rounded">"{sug.original}"</span>
        </div>
      )}

      {/* Suggestion Text (Specific Edits Only) */}
      {isSpecificMode && sug.suggestion && (
        <div className={`mb-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <span className="text-sm font-medium text-gray-700">Suggestion: </span>
          <span className="text-sm text-blue-700 bg-blue-50 px-1 rounded">"{sug.suggestion}"</span>
        </div>
      )}

      {/* Why Explanation */}
      {sug.why && (
        <div className={`text-xs text-purple-700 italic mb-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <span className="font-medium">Why: </span>{sug.why}
        </div>
      )}

      {/* Principles */}
      {sug.principles?.length > 0 && (
        <div className={`text-xs text-blue-700 mb-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <span className="font-medium">Principles: </span>{sug.principles.join(', ')}
        </div>
      )}

      {/* Deep Dive Button */}
      <div className={!isSpecificMode && onToggleSelect ? 'ml-6' : ''}>
        <button
          className="text-xs px-2 py-1 bg-purple-100 rounded text-purple-800 mr-2"
          onClick={() => onToggleDeepDive(sKey, sug, groupType)}
        >
          {expanded ? '- Deep Dive' : '+ Deep Dive'}
        </button>
      </div>

      {/* Deep Dive Expanded Content */}
      {expanded && (
        <div className={`mt-2 pl-2 border-l-4 border-purple-200 bg-purple-50 rounded ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <div className="text-sm text-purple-800 font-semibold mb-1">Mentor Insight</div>
          <div className="mb-2">
            {deepDiveLoading
              ? <span className="italic text-gray-500">Loading mentor insight...</span>
              : deepDiveContent || "Mentor insight unavailable."
            }
          </div>

          {/* Ask Lulu Chat Log */}
          <div className="mb-2">
            {(askLuluLogs || []).map((msg, i) => (
              <div key={i} className={msg.who === 'user'
                ? "text-xs text-gray-800 bg-gray-50 rounded p-1 mb-1"
                : "text-xs text-blue-700 bg-blue-50 rounded p-1 mb-1"}>
                <b>{msg.who === "user" ? "You: " : ""}</b>{msg.text}
              </div>
            ))}
            <div className="flex items-center">
              <input
                type="text"
                className="w-3/4 p-1 border rounded text-sm mr-1"
                value={askLuluInputs || ""}
                onChange={e => onAskLuluInput(sKey, e.target.value)}
                placeholder="Ask Lulu something about this suggestion..."
                onKeyDown={e => { if (e.key === "Enter") onAskLuluSubmit(sKey, sug, groupType) }}
              />
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                onClick={() => onAskLuluSubmit(sKey, sug, groupType)}
              >
                Ask Lulu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons (only show if not collapsed) */}
      {!collapsed && (
        <div className={`flex gap-2 mt-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          {isWriterEdit ? (
            <>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => onAccept(sug.idx, 'accepted')}>Keep Own</button>
              <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => onAccept(sug.idx, 'accepted', sug.lulu)}>Accept Lulu's Edit</button>
              <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => onReject(sug.idx, 'rejected')}>Reject</button>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                onClick={() => onStartRevise('writer', sug.idx, sug.lulu || sug.own)}>Revise</button>
            </>
          ) : (
            <>
              <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => onAccept(sug.idx, 'accepted')}>Accept</button>
              <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => onReject(sug.idx, 'rejected')}>Reject</button>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                onClick={() => onStartRevise(sug.type || groupType, sug.idx, sug.suggestion || sug.recommendation)}>Revise</button>
            </>
          )}
        </div>
      )}

      {/* Revise Form */}
      {activeRevise?.type === (isWriterEdit ? 'writer' : (sug.type || groupType)) && activeRevise?.idx === sug.idx && (
        <div className={`mt-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <textarea
            className="w-full p-2 border rounded text-base"
            rows={2}
            value={activeRevise.val}
            onChange={e => setActiveRevise(r => ({ ...r, val: e.target.value }))}
          />
          <div className="flex gap-2 mt-1">
            <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
              onClick={() => onSaveRevise(sug.type || groupType, sug.idx, activeRevise.val, isWriterEdit)}>Save</button>
            <button className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
              onClick={onCancelRevise}>Cancel</button>
          </div>
        </div>
      )}

      {/* Collapsed State Display */}
      {collapsed && (
        <div className={`flex items-center gap-3 mt-2 ${!isSpecificMode && onToggleSelect ? 'ml-6' : ''}`}>
          <div className="text-xs font-medium">
            {sug.state.charAt(0).toUpperCase() + sug.state.slice(1)}
          </div>
          <div className="text-xs text-gray-600">
            {isSpecificMode ? `${groupType} - ${sug.original?.slice(0, 30)}...` : groupType}
          </div>
          <button className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs border border-purple-300"
            onClick={() => onUndo(sug.idx)}
          >Undo</button>
        </div>
      )}
    </div>
  )
}