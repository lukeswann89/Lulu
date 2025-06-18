import React, { useState } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const editOptions = [
  { 
    id: 'professional', 
    title: 'Professional', 
    desc: 'Publishing-ready manuscript with comprehensive editing',
    workflow: ['developmental', 'structural', 'line', 'copy', 'proof']
  },
  { 
    id: 'lulu', 
    title: 'Let Lulu Assess', 
    desc: 'Let Lulu analyze your manuscript and recommend the best approach',
    workflow: [] // Will be determined by analysis
  },
  { 
    id: 'substantive', 
    title: 'Substantive', 
    desc: 'Developmental and structural big-picture editing',
    workflow: ['developmental', 'structural']
  },
  { 
    id: 'sentence', 
    title: 'Sentence-Level', 
    desc: 'Line and copy editing for clarity and flow',
    workflow: ['line', 'copy']
  },
  { 
    id: 'proof', 
    title: 'Proof', 
    desc: 'Final proofreading for errors and consistency',
    workflow: ['proof']
  },
  { 
    id: 'custom', 
    title: 'Custom', 
    desc: 'Select specific editing levels',
    workflow: [] // User will select
  }
];

const editLevels = [
  { id: 'developmental', name: 'Developmental', color: 'blue' },
  { id: 'structural', name: 'Structural', color: 'green' },
  { id: 'line', name: 'Line', color: 'orange' },
  { id: 'copy', name: 'Copy', color: 'red' },
  { id: 'proof', name: 'Proof', color: 'purple' }
];

export function EditingControls({
  text,
  editingMode,
  setEditingMode,
  onStartProEdit,
  cascadeController,
  editorReady,
  setSpecificSuggestions,
  setGeneralSuggestions,
  learningLog,
  setLearningLog
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showCustomOptions, setShowCustomOptions] = useState(false);
  const [customSelections, setCustomSelections] = useState([]);
  const [writerNotes, setWriterNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleOptionClick = (optionId) => {
    setSelectedOption(optionId);
    setShowCustomOptions(optionId === 'custom');
    
    // Reset custom selections when switching away from custom
    if (optionId !== 'custom') {
      setCustomSelections([]);
    }
  };

  const handleCustomToggle = (levelId) => {
    setCustomSelections(prev => 
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedOption || !text || !editorReady) return;

    // If Lulu assessment is selected, run analysis first
    if (selectedOption === 'lulu') {
      setIsAnalyzing(true);
      // Run manuscript analysis
      try {
        const response = await fetch('/api/manuscript-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, writerNotes })
        });
        
        const analysis = await response.json();
        // Handle analysis results and show recommendation
        // This will be implemented in Phase 2
        console.log('Analysis complete:', analysis);
      } catch (error) {
        console.error('Analysis failed:', error);
      }
      setIsAnalyzing(false);
      return;
    }

    // Determine workflow based on selection
    let workflow = [];
    if (selectedOption === 'custom') {
      workflow = customSelections;
    } else {
      const option = editOptions.find(opt => opt.id === selectedOption);
      workflow = option?.workflow || [];
    }

    // Start the editing workflow
    if (workflow.length > 0) {
      setEditingMode('specific');
      cascadeController.initializeWorkflow({
        phases: workflow,
        currentPhase: workflow[0]
      });
      onStartProEdit();
    }
  };

  const isSubmitDisabled = !selectedOption || 
    (selectedOption === 'custom' && customSelections.length === 0) ||
    !text || !editorReady || isAnalyzing;

  return (
    <div className="space-y-6">
      {/* Editorial Assessment */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Editorial Assessment</h2>
        
        {/* 6-Option Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {editOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedOption === option.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.desc}</p>
            </button>
          ))}
        </div>

        {/* Custom Options (shown when Custom is selected) */}
        {showCustomOptions && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-3">Select editing levels:</h4>
            <div className="space-y-2">
              {editLevels.map((level) => (
                <label key={level.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSelections.includes(level.id)}
                    onChange={() => handleCustomToggle(level.id)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>{level.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Writer's Editing Notes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3">Writer's Editing Notes</h3>
        <textarea
          value={writerNotes}
          onChange={(e) => setWriterNotes(e.target.value)}
          placeholder="Any specific areas of concern or focus for the editor..."
          className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
          isSubmitDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" size={20} />
            Analyzing Manuscript...
          </span>
        ) : (
          'Submit to Lulu'
        )}
      </button>
    </div>
  );
}