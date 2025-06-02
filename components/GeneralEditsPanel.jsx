import React from 'react';
import EditModeContainer from './EditModeContainer';
import AccordionSection from './AccordionSection';
import SuggestionCard from './SuggestionCard';

export default function GeneralEditsPanel({ 
  groupedSuggestions = {}, 
  onApply,
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
  getEditMeta
}) {

  // Render function for suggestion cards in different modes
  const renderSuggestionCard = ({ suggestions, selected = {}, onToggleSelect = null, focusMode = false, mode }) => {
    if (focusMode) {
      // Focus mode - render single suggestion
      const sug = suggestions[0];
      if (!sug) return null;
      
      const meta = getEditMeta(sug.type || sug.editType || 'General');
      const sKey = `${sug.isWriter ? 'w' : 's'}_${sug.type}_${sug.idx}`;
      
      return (
        <SuggestionCard
          sug={sug}
          idx={sug.idx}
          groupType={sug.type}
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
          priority={sug.priority}
        />
      );
    }

    // Overview mode - render grouped suggestions
    return Object.entries(suggestions).map(([category, items]) => {
      const meta = getEditMeta(category);
      
      return (
        <AccordionSection
          key={category}
          title={category}
          icon={meta?.icon}
          count={items?.length || 0}
          defaultOpen={(items?.length || 0) <= 3}
        >
          {items && items.length > 0 ? (
            items.map((item, index) => {
              const sKey = `${category}::${index}`;
              const suggestionMeta = getEditMeta(category);
              
              return (
                <SuggestionCard
                  key={sKey}
                  sug={{ ...item, idx: index, type: category }}
                  idx={index}
                  groupType={category}
                  meta={suggestionMeta}
                  sKey={sKey}
                  collapsed={['accepted', 'rejected', 'revised'].includes(item.state)}
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
                  priority={item.priority}
                  selected={selected[sKey]}
                  onToggleSelect={onToggleSelect}
                />
              );
            })
          ) : (
            <p className="text-sm text-gray-500 italic">No suggestions in this category.</p>
          )}
        </AccordionSection>
      );
    });
  };

  return (
    <EditModeContainer
      title="📘 General Editorial Feedback"
      suggestions={groupedSuggestions}
      mode="General Edits"
      renderSuggestionCard={renderSuggestionCard}
      onApplySelected={onApply}
    />
  );
}