// /components/WritingToolbar.jsx
// Writing toolbar for Pure Writing Mode

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  PencilIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  saveDocument, 
  exportDocument, 
  countWords, 
  countCharacters 
} from '../utils/documentManager';

const WritingToolbar = ({ 
  content = '', 
  title = 'Untitled', 
  onTitleChange = () => {}, 
  onSave = () => {}, 
  onExport = () => {}, 
  onSwitchToEdit = () => {}, 
  onPlanWithMuse = () => {},
  autoSaveStatus = 'idle', // 'idle', 'saving', 'saved', 'error'
  lastSaved = null
}) => {
  const [localTitle, setLocalTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showTitleInput, setShowTitleInput] = useState(false);

  // Update local title when prop changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Handle title change
  const handleTitleChange = (newTitle) => {
    setLocalTitle(newTitle);
    onTitleChange(newTitle);
  };

  // Handle manual save
  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      const result = await saveDocument(content, localTitle);
      if (result.success) {
        onSave(result.documentData);
      } else {
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!content.trim()) return;
    
    setIsExporting(true);
    try {
      const result = exportDocument(content, localTitle);
      if (result.success) {
        onExport();
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle switch to edit mode
  const handleSwitchToEdit = () => {
    if (content.trim()) {
      onSwitchToEdit();
    }
  };

  // Handle plan with muse
  const handlePlanWithMuse = () => {
    if (content.trim()) {
      onPlanWithMuse();
    }
  };

  // Calculate word and character counts
  const wordCount = countWords(content);
  const characterCount = countCharacters(content);

  // Auto-save status indicator
  const getAutoSaveStatusIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-blue-600">
            <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-green-600">
            <CheckIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side - Title and stats */}
        <div className="flex items-center space-x-4">
          {/* Document title */}
          <div className="flex items-center">
            {showTitleInput ? (
              <input
                type="text"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setShowTitleInput(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowTitleInput(false);
                  }
                  if (e.key === 'Escape') {
                    setLocalTitle(title);
                    setShowTitleInput(false);
                  }
                }}
                className="text-lg font-semibold text-gray-900 border-none outline-none bg-transparent focus:ring-0 px-0"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowTitleInput(true)}
                className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors px-2 py-1 rounded"
              >
                {localTitle || 'Untitled'}
              </button>
            )}
          </div>

          {/* Word and character count */}
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{characterCount} characters</span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Auto-save status */}
          {getAutoSaveStatusIcon()}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </button>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting || !content.trim()}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Export
              </>
            )}
          </button>

          {/* Plan with Muse button */}
          <button
            onClick={handlePlanWithMuse}
            disabled={!content.trim()}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-4 w-4 mr-1" />
            Plan with Muse
          </button>

          {/* Edit with AI button */}
          <button
            onClick={handleSwitchToEdit}
            disabled={!content.trim()}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PencilIcon className="h-4 w-4 mr-1" />
            Edit with AI
          </button>
        </div>
      </div>

      {/* Last saved indicator */}
      {lastSaved && (
        <div className="mt-2 text-xs text-gray-500">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default WritingToolbar; 