// /components/SuggestionCard.jsx

import React from 'react';
import { generateSuggestionTitle, getShortWhy } from '../utils/titleGenerator';

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
  const isWriterEdit = sug.isWriter || groupType === "Writer's Edit";
  const mainText = isSpecificMode 
    ? sug.suggestion 
    : (isWriterEdit ? (sug.lulu || sug.own) : (sug.recommendation || sug.suggestion));

  // Generate intelligent title
  const cardTitle = sug.title || generateSuggestionTitle(
    mainText, 
    sug.why, 
    groupType, 
    sug.original
  );
  
  // Get short version of why for main card (full version in deep dive)
  const shortWhy = getShortWhy(sug.why);
  
  // Priority styling for ALL cards
  const priorityColors = {
    High: { text: 'text-red-600', bg: 'bg-red-100', icon: '🔴' },
    Medium: { text: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' },
    Low: { text: 'text-gray-500', bg: 'bg-gray-100', icon: '⚪' }
  };

  const priorityStyle = (priority || sug.priority) ? priorityColors[priority || sug.priority] : null;

  // Handle actions with auto-advance and proper card closure
  const handleAccept = () => {
    if (isWriterEdit) {
      // Writer's Edit has different signature - (idx, state, revision)
      onAccept(idx, 'accepted');
    } else if (isSpecificMode) {
      // Specific Edits - (idx)
      onAccept(idx);
    } else {
      // General Edits - (idx, state, revision, groupType)
      onAccept(idx, 'accepted', null, groupType);
    }
    
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  const handleReject = () => {
    if (isWriterEdit) {
      onReject(idx, 'rejected');
    } else if (isSpecificMode) {
      onReject(idx);
    } else {
      onReject(idx, 'rejected', null, groupType);
    }
    
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  const handleRevise = () => {
    if (isWriterEdit) {
      onStartRevise('writer', idx, sug.lulu || sug.own);
    } else {
      onStartRevise(groupType, idx, mainText);
    }
  };

  const handleUseOwnForWriter = () => {
    // For Writer's Edit "Keep Own" button
    onAccept(idx, 'accepted', sug.own);
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  const handleAcceptLuluForWriter = () => {
    // For Writer's Edit "Accept Lulu's Edit" button
    onAccept(idx, 'accepted', sug.lulu);
    if (autoAdvance) {
      setTimeout(() => autoAdvance(), 250);
    }
  };

  // If collapsed, show minimal view with working undo
  if (collapsed) {
    return (
      <div className="border rounded p-3 mb-2 bg-gray-50 opacity-75">
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

          {/* Short Why (first ~12 words only) */}
          {shortWhy && (
            <div className="text-sm text-purple-700 italic mb-3">
              <span className="font-medium">Why: </span>{shortWhy}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mb-2">
            {isWriterEdit ? (
              <>
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={handleUseOwnForWriter}
                >
                  Keep Own
                </button>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={handleAcceptLuluForWriter}
                >
                  Accept Lulu's Edit
                </button>
                <button 
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                  onClick={handleReject}
                >
                  Reject
                </button>
                <button 
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                  onClick={handleRevise}
                >
                  Revise
                </button>
              </>
            ) : (
              <>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={handleAccept}
                >
                  Accept
                </button>
                <button 
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                  onClick={handleReject}
                >
                  Reject
                </button>
                <button 
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                  onClick={handleRevise}
                >
                  Revise
                </button>
              </>
            )}
          </div>

          {/* Deep Dive Button */}
          <button
            className="text-xs px-2 py-1 bg-purple-100 rounded text-purple-800 hover:bg-purple-200 mb-2"
            onClick={() => onToggleDeepDive(sKey, sug, groupType)}
          >
            {expanded ? '- Deep Dive' : '+ Deep Dive'}
          </button>

          {/* Revise Form */}
          {activeRevise?.type === (isWriterEdit ? 'writer' : groupType) && activeRevise?.idx === idx && (
            <div className="mt-3">
              <textarea
                className="w-full p-2 border rounded text-sm"
                rows={2}
                value={activeRevise.val}
                onChange={e => setActiveRevise(r => ({ ...r, val: e.target.value }))}
                placeholder="Enter your revision..."
              />
              <div className="flex gap-2 mt-2">
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => {
                    onSaveRevise(groupType, idx, activeRevise.val, isWriterEdit);
                    if (autoAdvance) {
                      setTimeout(() => autoAdvance(), 250);
                    }
                  }}
                >
                  Save
                </button>
                <button 
                  className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                  onClick={onCancelRevise}
                >
                  Cancel
                </button>
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
  );
}