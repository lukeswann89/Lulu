// /containers/EditingControls.jsx
// EDITING CONTROLS CONTAINER: Right panel with assessment, form controls, and submission

import React from 'react';
import { EDIT_TYPES, EDIT_DEPTHS, PROFILES, EDIT_TYPE_TOOLTIP } from '../utils/editorConfig';
import Tooltip from '../components/Tooltip';
import WorkflowAssessment from '../components/WorkflowAssessment';

export default function EditingControls({
  // Assessment phase props
  isAssessmentPhase,
  assessmentProps = {},
  
  // Form state
  editType = [],
  mode = 'General Edits',
  editDepth = 'Pro',
  editProfile = 'Voice',
  thresholdOnly = false,
  writerCue = '',
  cueFocus = false,
  
  // Form handlers
  onEditTypeChange,
  onModeChange,
  onEditDepthChange,
  onEditProfileChange,
  onThresholdChange,
  onWriterCueChange,
  onCueFocusChange,
  
  // Submission
  onSubmit,
  loading = false,
  error = '',
  canSubmit = true,
  
  // Navigation
  onReturnToOptions,
  showReturnButton = false,
  
  // Styling
  className = "",
  compact = false
}) {

  // Default CSS classes
  const controlsClass = `w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit ${className}`;
  const minWidth = compact ? '20rem' : '24rem';

  // Edit type helpers
  const isChecked = (type) => {
    if (type === 'Full Edit') return editType.length === EDIT_TYPES.length - 1;
    return editType.includes(type);
  };

  const toggleEditType = (type) => {
    if (type === 'Full Edit') {
      if (isChecked('Full Edit')) {
        onEditTypeChange([]);
      } else {
        onEditTypeChange(EDIT_TYPES.filter(t => t.type !== 'Full Edit').map(t => t.type));
      }
      return;
    }
    
    const newTypes = editType.includes(type)
      ? editType.filter(t => t !== type)
      : [...editType, type];
    
    onEditTypeChange(newTypes);
  };

  return (
    <div className={controlsClass} style={{ minWidth }}>
      {/* Return to Options Button */}
      {showReturnButton && (
        <button
          className="mb-6 px-4 py-2 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 transition-colors"
          onClick={onReturnToOptions}
        >
          Return to Edit Options
        </button>
      )}

      {/* Assessment Phase UI */}
      {isAssessmentPhase ? (
        <WorkflowAssessment
          {...assessmentProps}
          compact={compact}
        />
      ) : (
        /* Traditional Edit Options */
        <TraditionalEditOptions
          editType={editType}
          mode={mode}
          editDepth={editDepth}
          editProfile={editProfile}
          thresholdOnly={thresholdOnly}
          writerCue={writerCue}
          cueFocus={cueFocus}
          onEditTypeChange={onEditTypeChange}
          onModeChange={onModeChange}
          onEditDepthChange={onEditDepthChange}
          onEditProfileChange={onEditProfileChange}
          onThresholdChange={onThresholdChange}
          onWriterCueChange={onWriterCueChange}
          onCueFocusChange={onCueFocusChange}
          onSubmit={onSubmit}
          loading={loading}
          error={error}
          canSubmit={canSubmit}
          isChecked={isChecked}
          toggleEditType={toggleEditType}
          compact={compact}
        />
      )}
    </div>
  );
}

// Traditional Edit Options Component
function TraditionalEditOptions({
  editType,
  mode,
  editDepth,
  editProfile,
  thresholdOnly,
  writerCue,
  cueFocus,
  onEditTypeChange,
  onModeChange,
  onEditDepthChange,
  onEditProfileChange,
  onThresholdChange,
  onWriterCueChange,
  onCueFocusChange,
  onSubmit,
  loading,
  error,
  canSubmit,
  isChecked,
  toggleEditType,
  compact = false
}) {
  
  return (
    <>
      {/* Writer's Editing Notes */}
      <label className="font-semibold flex items-center mt-2 mb-1">
        Writer's Editing Notes
        <Tooltip text="Give Lulu your personal instructions or editing requests—she'll prioritise these as writer's edits." />
      </label>
      <textarea
        className="w-full p-2 border rounded mb-4 text-base focus:border-purple-400 focus:ring-purple-400 transition-colors"
        rows={compact ? 2 : 3}
        style={{
          color: !cueFocus && !writerCue ? '#888' : '#222'
        }}
        placeholder="Add any specific instructions or desired edits for Lulu to consider."
        value={cueFocus || writerCue ? writerCue : ''}
        onFocus={() => onCueFocusChange(true)}
        onBlur={() => onCueFocusChange(false)}
        onChange={e => onWriterCueChange(e.target.value)}
      />

      {/* Edit Types */}
      <div className="mb-3">
        <label className="font-semibold block mb-1">
          Edit Types:
          <Tooltip text={EDIT_TYPE_TOOLTIP} />
        </label>
        <div className="flex flex-wrap gap-3">
          {EDIT_TYPES.map(et => (
            <label key={et.type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="checkbox"
                checked={isChecked(et.type)}
                onChange={() => toggleEditType(et.type)}
                className="rounded"
              />
              <span className="flex items-center gap-1 text-sm">
                {et.icon} {et.type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Edit Configuration */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'} mb-3`}>
        <div>
          <label className="font-semibold block mb-1">Edit Depth:</label>
          <select 
            className="p-2 border rounded w-full focus:border-purple-400 focus:ring-purple-400 transition-colors" 
            value={editDepth} 
            onChange={e => onEditDepthChange(e.target.value)}
          >
            {EDIT_DEPTHS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        
        <div>
          <label className="font-semibold block mb-1">Editorial Profile:</label>
          <select 
            className="p-2 border rounded w-full focus:border-purple-400 focus:ring-purple-400 transition-colors" 
            value={editProfile} 
            onChange={e => onEditProfileChange(e.target.value)}
          >
            {PROFILES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Additional Options */}
      <div className="mb-3">
        <div className="flex items-center gap-2 font-semibold">
          <input 
            type="checkbox" 
            checked={thresholdOnly} 
            onChange={() => onThresholdChange(!thresholdOnly)}
            className="rounded"
          />
          <label className="cursor-pointer text-sm">
            World-Class Threshold Only
          </label>
          <Tooltip text="Only suggest improvements if the text doesn't meet professional literary standards." />
        </div>
      </div>

      {/* Editing Mode */}
      <div className="mb-3">
        <label className="font-semibold block mb-1">Editing Mode:</label>
        <select 
          className="p-2 border rounded w-full focus:border-purple-400 focus:ring-purple-400 transition-colors" 
          value={mode} 
          onChange={e => onModeChange(e.target.value)}
        >
          <option>General Edits</option>
          <option>Specific Edits</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 mb-3">
        <button 
          onClick={onSubmit} 
          disabled={loading || !canSubmit} 
          className={`
            flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200
            ${loading || !canSubmit 
              ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
              : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg transform hover:scale-105'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Thinking...
            </span>
          ) : (
            "Submit to Lulu"
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <span className="font-medium">Error:</span>
          </div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Help Text */}
      {!compact && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
          <div className="font-medium text-gray-700 mb-1">💡 Quick Tips:</div>
          <ul className="space-y-1">
            <li>• Select multiple edit types for comprehensive feedback</li>
            <li>• Use Writer's Notes for specific focus areas</li>
            <li>• Pro depth provides the most thorough analysis</li>
            <li>• General Edits give big-picture feedback first</li>
          </ul>
        </div>
      )}
    </>
  );
}

// Compact version for smaller spaces
export function CompactEditingControls(props) {
  return <EditingControls {...props} compact={true} className="w-full md:w-80" />;
}

// Assessment-only version
export function AssessmentControls({
  assessmentProps,
  className = "",
  ...otherProps
}) {
  return (
    <EditingControls
      {...otherProps}
      isAssessmentPhase={true}
      assessmentProps={assessmentProps}
      className={className}
    />
  );
}

// Form validation helper
export function validateEditingForm({ editType, text, mode }) {
  const errors = [];
  
  if (!text || text.trim().length < 10) {
    errors.push("Please enter at least 10 characters of text to edit.");
  }
  
  if (editType.length === 0) {
    errors.push("Please select at least one edit type.");
  }
  
  if (!mode) {
    errors.push("Please select an editing mode.");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export helper function
export { TraditionalEditOptions };