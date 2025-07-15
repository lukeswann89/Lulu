import React from 'react';
import { getEditMeta } from '../utils/editorConfig.js';

/**
 * LULU'S CONSCIENCE: SuggestionConflictCard
 * 
 * This component manifests the core principle: "Illuminate, Don't Dictate"
 * When multiple suggestions overlap, instead of secretly choosing one,
 * Lulu presents all options with calm clarity, empowering the writer to choose.
 * 
 * The design follows the established visual DNA of SuggestionCard.js,
 * ensuring architectural consistency across the application.
 */

// Helper function to generate short title from suggestion text (inherited from SuggestionCard)
function generateShortTitle(text) {
  if (!text) return 'Untitled Option';
  
  // Remove quotes and clean up text
  const cleanText = text.replace(/^["']|["']$/g, '').trim();
  
  // Split into words and take first 3-7 words
  const words = cleanText.split(/\s+/);
  const shortTitle = words.slice(0, Math.min(7, words.length)).join(' ');
  
  // Add ellipsis if truncated
  return words.length > 7 ? `${shortTitle}...` : shortTitle;
}

export default function SuggestionConflictCard({ conflictGroup, onAccept }) {
  if (!conflictGroup || !conflictGroup.isConflictGroup || !conflictGroup.suggestions) {
    return null;
  }

  const { suggestions, from, to } = conflictGroup;

  // Priority colors (inherited from SuggestionCard)
  const priorityColors = {
    High: { text: 'text-red-600', bg: 'bg-red-100', icon: '🔴' },
    Medium: { text: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' },
    Low: { text: 'text-gray-500', bg: 'bg-gray-100', icon: '⚪' }
  };

  return (
    <div className="border-2 border-purple-300 rounded-lg p-4 mb-4 bg-purple-50">
      {/* Header - The Moment of Creative Choice */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl text-purple-600">✨</span>
        <h3 className="text-lg font-semibold text-purple-800">
          Choose the best direction for this phrase:
        </h3>
      </div>

      {/* Context: Show the text range being addressed */}
      <div className="mb-4 p-3 bg-white rounded border border-purple-200">
        <div className="text-sm text-gray-600 mb-1">
          <span className="font-medium">Text positions:</span> {from} to {to}
        </div>
        <div className="text-sm text-gray-700 italic">
          Multiple creative paths have been identified for this section.
        </div>
      </div>

      {/* The Creative Options */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const meta = getEditMeta(suggestion.editType || suggestion.type || 'Line');
          const cardTitle = suggestion.title || generateShortTitle(suggestion.replacement || suggestion.suggestion);
          const priorityStyle = suggestion.priority ? priorityColors[suggestion.priority] : null;

          return (
            <div 
              key={suggestion.id || index}
              className={`border rounded-lg p-3 ${meta?.color || 'bg-gray-50'} hover:shadow-md transition-shadow`}
            >
              {/* Option Header */}
              <div className="flex items-center gap-2 mb-2">
                {priorityStyle && (
                  <span className={priorityStyle.text} title={`${suggestion.priority} Priority`}>
                    {priorityStyle.icon}
                  </span>
                )}
                <span className={`text-lg ${meta?.iconColor || 'text-gray-600'}`}>
                  {meta?.icon || '✏️'}
                </span>
                <span className="font-bold text-base">{cardTitle}</span>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded ml-auto">
                  Option {index + 1}
                </span>
              </div>

              {/* Original Text */}
              {suggestion.original && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-700">Original: </span>
                  <span className="text-sm text-red-700 bg-red-50 px-1 rounded">
                    "{suggestion.original}"
                  </span>
                </div>
              )}

              {/* Suggested Replacement */}
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">Suggestion: </span>
                <span className="text-sm text-blue-700 font-medium">
                  "{suggestion.replacement || suggestion.suggestion}"
                </span>
              </div>

              {/* Why This Option */}
              {suggestion.why && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-purple-700">Why: </span>
                  <span className="text-sm text-purple-800 italic">{suggestion.why}</span>
                </div>
              )}

              {/* Edit Type Context */}
              {suggestion.editType && (
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700">Edit Type: </span>
                  <span className={`text-sm ${meta?.iconColor || 'text-gray-600'}`}>
                    {suggestion.editType}
                  </span>
                  {meta?.help && (
                    <span className="text-xs text-gray-500 ml-1">({meta.help})</span>
                  )}
                </div>
              )}

              {/* Action: Choose This Path */}
              <div className="flex justify-end">
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  onClick={() => onAccept(suggestion.id)}
                >
                  ✨ Choose This Path
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - Gentle Guidance */}
      <div className="mt-4 pt-3 border-t border-purple-200">
        <div className="text-sm text-purple-700 italic text-center">
          💡 Each option represents a different creative direction. Choose the one that best serves your story.
        </div>
      </div>
    </div>
  );
} 