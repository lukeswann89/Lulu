import React from 'react';
import EditModeContainer from './EditModeContainer';
import AccordionSection from './AccordionSection';
import SuggestionCard from './SuggestionCard';

export default function SpecificEditsPanel({
  suggestions = [],
  // Deep dive and interaction props
  expandedSuggestions,
  deepDiveContent,
  deepDiveLoading,
  askLuluLogs,
  askLuluInputs,
  onToggleDeepDive,
  onAskLuluInput,
  onAskLuluSubmit,
  // Action handlers
  onAccept,
  onReject,
  onRevise,
  onUndo,
  onStartRevise,
  onSaveRevise,
  onCancelRevise,
  activeRevise,
  setActiveRevise,
  getEditMeta,
  // Specific Edits controls
  onUndoHistory,
  onRedoHistory,
}) {
  
  // Group suggestions by editType/type
  const groupedSuggestions = {};
  for (const [i, sug] of suggestions.entries()) {
    const type = sug.editType || sug.type || 'Other';
    if (!groupedSuggestions[type]) groupedSuggestions[type] = [];
    groupedSuggestions[type].push({ ...sug, idx: i });
  }

  // Render function for suggestion cards in different modes
  const renderSuggestionCard = ({ suggestions, focusMode = false, mode }) => {
    if (focusMode) {
      // Focus mode - render single suggestion
      const sug = suggestions[0];
      if (!sug) return null;
      
      const meta = getEditMeta(sug.editType || sug.type || 'Other');
      const sKey = `spec_${sug.editType || sug.type}_${sug.idx}`;
      
      return (
        <SuggestionCard
          sug={sug}
          idx={sug.idx}
          groupType={sug.editType || sug.type}
          meta={meta}
          sKey={sKey}
          collapsed={['accepted', 'rejected', 'revised'].includes(sug.state)}
          expanded={expandedSuggestions?.[sKey]}
          deepDiveContent={deepDiveContent?.[sKey]}
          deepDiveLoading={deepDiveLoading?.[sKey]}
          askLuluLogs={askLuluLogs?.[sKey]}
          askLuluInputs={askLuluInputs?.[sKey]}
          onToggleDeepDive={onToggleDeepDive}
          onAskLuluInput={onAskLuluInput}
          onAskLuluSubmit={onAskLuluSubmit}
          onAccept={onAccept}
          onReject={onReject}
          onRevise={onRevise}
          onUndo={onUndo}
          onStartRevise={onStartRevise}
          onSaveRevise={onSaveRevise}
          onCancelRevise={onCancelRevise}
          activeRevise={activeRevise}
          setActiveRevise={setActiveRevise}
          mode={mode}
        />
      );
    }

    // Overview mode - render grouped suggestions
    return Object.entries(suggestions).map(([type, arr]) => {
      const meta = getEditMeta(type);
      
      return (
        <AccordionSection
          key={type}
          title={type}
          icon={meta?.icon}
          count={arr.length}
          defaultOpen={arr.length <= 3}
        >
          {arr.map((sug) => {
            const sKey = `spec_${type}_${sug.idx}`;
            
            return (
              <SuggestionCard
                key={sKey}
                sug={sug}
                idx={sug.idx}
                groupType={type}
                meta={meta}
                sKey={sKey}
                collapsed={['accepted', 'rejected', 'revised'].includes(sug.state)}
                expanded={expandedSuggestions?.[sKey]}
                deepDiveContent={deepDiveContent?.[sKey]}
                deepDiveLoading={deepDiveLoading?.[sKey]}
                askLuluLogs={askLuluLogs?.[sKey]}
                askLuluInputs={askLuluInputs?.[sKey]}
                onToggleDeepDive={onToggleDeepDive}
                onAskLuluInput={onAskLuluInput}
                onAskLuluSubmit={onAskLuluSubmit}
                onAccept={onAccept}
                onReject={onReject}
                onRevise={onRevise}
                onUndo={onUndo}
                onStartRevise={onStartRevise}
                onSaveRevise={onSaveRevise}
                onCancelRevise={onCancelRevise}
                activeRevise={activeRevise}
                setActiveRevise={setActiveRevise}
                mode={mode}
              />
            );
          })}
        </AccordionSection>
      );
    });
  };

  // Extra controls for Specific Edits (Undo/Redo buttons)
  const extraControls = (
    <div className="flex gap-2">
      {onUndoHistory && (
        <button 
          className="px-2 py-1 bg-gray-200 rounded text-xs"
          onClick={onUndoHistory}
        >
          Undo
        </button>
      )}
      {onRedoHistory && (
        <button 
          className="px-2 py-1 bg-gray-200 rounded text-xs"
          onClick={onRedoHistory}
        >
          Redo
        </button>
      )}
    </div>
  );

  if (!suggestions.length) {
    return (
      <div className="mt-6 bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">✏️ Specific Edit Suggestions</h2>
        <div className="text-gray-400 italic">No specific suggestions found.</div>
      </div>
    );
  }

  return (
    <EditModeContainer
      title="✏️ Specific Edit Suggestions"
      suggestions={groupedSuggestions}
      mode="Specific Edits"
      renderSuggestionCard={renderSuggestionCard}
      extraControls={extraControls}
    />
  );
}
      