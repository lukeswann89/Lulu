import { useState, useEffect } from 'react';

export default function CanvasBox({ title, data, structure, layoutStyle, onEdit, category }) {
  const [recentlyUpdated, setRecentlyUpdated] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Track recent updates for visual feedback
  useEffect(() => {
    const updatedSections = [];
    Object.keys(structure.sections).forEach(sectionKey => {
      if (data[sectionKey]?.trim()) {
        updatedSections.push(sectionKey);
      }
    });
    
    // Find newly updated sections
    const newUpdates = updatedSections.filter(section => 
      !recentlyUpdated.includes(section)
    );
    
    if (newUpdates.length > 0) {
      setRecentlyUpdated(updatedSections);
      
      // Clear the "recently updated" highlight after 3 seconds
      const timer = setTimeout(() => {
        setRecentlyUpdated([]);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [data, structure.sections, recentlyUpdated]);

  // Calculate completion for this box
  const completedSections = Object.keys(structure.sections).filter(
    key => data[key]?.trim()
  ).length;
  const totalSections = Object.keys(structure.sections).length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);

  // Format section key for display
  const formatSectionTitle = (key) => {
    const titleMap = {
      protagonist: 'Protagonist',
      antagonist: 'Antagonist',
      supporting: 'Supporting Cast',
      actI: 'Act I - Setup',
      actII: 'Act II - Conflict',
      actIII: 'Act III - Resolution',
      setting: 'Setting',
      history: 'History',
      rules: 'Rules',
      central: 'Central Theme',
      symbolism: 'Symbolism',
      message: 'Message',
      tone: 'Tone',
      style: 'Style',
      pov: 'Point of View'
    };
    return titleMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Handle edit click
  const handleEditClick = (sectionKey) => {
    setEditingSection(sectionKey);
    setEditValue(data[sectionKey] || '');
  };

  // Handle save edit
  const handleSaveEdit = (sectionKey) => {
    if (onEdit) {
      onEdit(category, sectionKey, editValue);
    }
    setEditingSection(null);
    setEditValue('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditValue('');
  };

  // Handle key press in edit mode
  const handleKeyPress = (e, sectionKey) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(sectionKey);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={`h-full border-2 rounded-lg transition-all duration-300 ${structure.color} ${
      completedSections > 0 ? 'border-opacity-100' : 'border-opacity-50'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-current border-opacity-20">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {completedSections}/{totalSections}
            </span>
            {completionPercentage > 0 && (
              <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full border">
                <span className="text-xs font-medium text-gray-700">
                  {completionPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 h-full overflow-y-auto">
        {Object.entries(structure.sections).map(([sectionKey, placeholder]) => {
          const content = data[sectionKey]?.trim();
          const isRecentlyUpdated = recentlyUpdated.includes(sectionKey);
          const isEmpty = !content;
          const isEditing = editingSection === sectionKey;

          return (
            <div
              key={sectionKey}
              className={`transition-all duration-500 ${
                isRecentlyUpdated ? `${structure.highlight} border-2 border-current border-opacity-40` : ''
              }`}
            >
              {/* Section Title */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {formatSectionTitle(sectionKey)}
                </h4>
                <div className="flex items-center space-x-2">
                  {content && !isEditing && (
                    <button
                      onClick={() => handleEditClick(sectionKey)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      title="Click to edit"
                    >
                      Edit
                    </button>
                  )}
                  {content && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {isRecentlyUpdated && (
                        <span className="text-xs text-green-600 animate-pulse">Updated</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section Content */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, sectionKey)}
                    className="w-full min-h-[100px] p-3 border-2 border-purple-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder={placeholder}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(sectionKey)}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`min-h-[60px] p-3 rounded border cursor-pointer transition-all ${
                    isEmpty 
                      ? 'bg-white bg-opacity-50 border-dashed border-gray-300 hover:border-purple-400' 
                      : 'bg-white border-gray-200 hover:border-purple-400'
                  }`}
                  onClick={() => isEmpty && handleEditClick(sectionKey)}
                  title={isEmpty ? "Click to add content" : "Click Edit to modify"}
                >
                  {content ? (
                    <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {content}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm italic leading-relaxed">
                      {placeholder}
                      <span className="block text-xs text-purple-600 mt-1">Click to add content</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state encouragement */}
        {completedSections === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Start chatting about your story or click any section to add content directly!
            </p>
          </div>
        )}

        {/* Partial completion encouragement */}
        {completedSections > 0 && completedSections < totalSections && (
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Great start! Keep exploring this aspect of your story.
            </p>
          </div>
        )}

        {/* Complete section celebration */}
        {completedSections === totalSections && (
          <div className="text-center py-4 border-t border-green-200 bg-green-50 rounded">
            <div className="text-green-600 mb-1">
              <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700">
              {title.toLowerCase()} section complete! 🎉
            </p>
          </div>
        )}
      </div>
    </div>
  );
}