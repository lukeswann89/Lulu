import React, { useState } from 'react';
import { ensureGroupedSuggestions } from '../utils/suggestionUtils';

// Shared container component that provides Overview/Focus View functionality
// Used by both GeneralEditsPanel and SpecificEditsPanel
export default function EditModeContainer({
  title,
  icon,
  suggestions = [],
  mode = "General Edits", // "General Edits" or "Specific Edits"
  renderSuggestionCard, // Function to render individual cards
  onApplySelected = null, // For General Edits apply functionality
  extraControls = null, // Additional controls (e.g., Undo/Redo for Specific Edits)
}) {
  const [viewMode, setViewMode] = useState('overview'); // 'overview' or 'focus'
  const [focusIndex, setFocusIndex] = useState(0);
  const [selected, setSelected] = useState({}); // For General Edits selection

  // Defensive: always ensure correct grouped shape for General Edits
  const safeSuggestions = (mode === "General Edits")
    ? ensureGroupedSuggestions(suggestions)
    : suggestions;

  // Calculate total suggestions
  const allSuggestions = Array.isArray(safeSuggestions)
    ? safeSuggestions
    : Object.values(safeSuggestions).flat();
  const suggestionsLength = allSuggestions.length;

  // FIX: Properly detect truly empty for both arrays and grouped objects
  const isTrulyEmpty = Array.isArray(safeSuggestions)
    ? safeSuggestions.length === 0
    : Object.values(safeSuggestions).every(arr => Array.isArray(arr) && arr.length === 0);

  // Check if all edits are processed
  const editsProcessed = allSuggestions.filter(s =>
    ['accepted', 'rejected', 'revised'].includes(s.state)
  ).length;
  const allDone = suggestionsLength > 0 && editsProcessed === suggestionsLength;

  // Toggle selection for General Edits
  const toggleSelection = (key) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Apply selected for General Edits
  const handleApplySelected = () => {
    if (!onApplySelected) return;
    const itemsToApply = Object.entries(selected)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => {
        const [type, index] = key.split('::');
        return Array.isArray(safeSuggestions[type])
          ? safeSuggestions[type][parseInt(index)]
          : undefined;
      })
      .filter(Boolean)
      .map(item => `• ${item.recommendation || item.suggestion}`);

    if (itemsToApply.length > 0) {
      onApplySelected(`Changes to make:\n${itemsToApply.join('\n')}`);
    }
  };

  // FIX: Early return if there are truly no suggestions to show
  if (isTrulyEmpty) {
    return (
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold text-purple-800">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        <div className="text-gray-400 italic mt-4">No suggestions found.</div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-purple-800">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {extraControls}
          <div className="flex gap-1">
            <button
              className={`px-2 py-1 rounded text-xs ${
                viewMode === 'overview' ? 'bg-purple-200 font-bold' : 'bg-gray-100'
              }`}
              onClick={() => setViewMode('overview')}
            >
              Overview
            </button>
            <button
              className={`px-2 py-1 rounded text-xs ${
                viewMode === 'focus' ? 'bg-purple-200 font-bold' : 'bg-gray-100'
              }`}
              onClick={() => setViewMode('focus')}
            >
              Focus View
            </button>
          </div>
        </div>
      </div>

      {/* All Done Message */}
      {allDone && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 font-semibold rounded">
          ✅ All edits processed. Great work!
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'overview' ? (
        <>
          {/* Overview Mode - Show all suggestions grouped */}
          {renderSuggestionCard({
            suggestions: safeSuggestions,
            selected,
            onToggleSelect: toggleSelection,
            mode
          })}

          {/* Apply Selected Button for General Edits */}
          {mode === "General Edits" && onApplySelected && Object.keys(selected).some(k => selected[k]) && (
            <div className="mt-4">
              <button
                onClick={handleApplySelected}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm"
              >
                ✅ Apply Selected Notes to Text
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Focus Mode - Show one suggestion at a time */}
          {suggestionsLength > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{focusIndex + 1} of {suggestionsLength}</span>
              </div>

              {/* Render focused suggestion */}
              {renderSuggestionCard({
                suggestions: [allSuggestions[focusIndex]],
                focusMode: true,
                mode
              })}

              {/* Navigation */}
              <div className="flex justify-between mt-3">
                <button
                  disabled={focusIndex === 0}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded disabled:opacity-50"
                  onClick={() => setFocusIndex(i => Math.max(0, i - 1))}
                >
                  Prev
                </button>
                <button
                  disabled={focusIndex === suggestionsLength - 1}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded disabled:opacity-50"
                  onClick={() => setFocusIndex(i => Math.min(suggestionsLength - 1, i + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 italic">No suggestions to display.</div>
          )}
        </>
      )}
    </div>
  );
}
