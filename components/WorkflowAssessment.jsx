// /components/WorkflowAssessment.jsx
// ASSESSMENT PHASE UI: Edit depth analysis + user goals + recommended workflow

import React, { useState, useEffect } from 'react';
import { getEditMeta } from '../utils/editorConfig';

// Assessment questions and analysis
const ASSESSMENT_QUESTIONS = {
  editDepth: {
    title: "What type of editing does your manuscript need?",
    subtitle: "Lulu will analyze your text and recommend the most effective workflow",
    options: [
      {
        value: 'unknown',
        label: 'Let Lulu Assess',
        description: 'Lulu will analyze your manuscript and recommend the best approach',
        icon: '🔍'
      },
      {
        value: 'early_draft', 
        label: 'Early Draft',
        description: 'First draft needing major development and structure work',
        icon: '🌱'
      },
      {
        value: 'revision_ready',
        label: 'Revision Ready', 
        description: 'Solid draft needing line editing and polish',
        icon: '✏️'
      },
      {
        value: 'near_final',
        label: 'Near Final',
        description: 'Polished draft needing copy editing and proofreading',
        icon: '🎯'
      }
    ]
  },
  
  userGoals: {
    title: "What are your editing goals?",
    subtitle: "Select all that apply to customize Lulu's approach",
    multiSelect: true,
    options: [
      {
        value: 'pro_quality',
        label: 'Professional Quality',
        description: 'Publishing-ready manuscript with comprehensive editing',
        icon: '🏆'
      },
      {
        value: 'macro_feedback',
        label: 'Big Picture Feedback', 
        description: 'High-level editorial review and story development',
        icon: '🖼️'
      },
      {
        value: 'micro_polish',
        label: 'Line-Level Polish',
        description: 'Sentence clarity, grammar, and proofreading',
        icon: '✨'
      },
      {
        value: 'learning_focused',
        label: 'Learning & Growth',
        description: 'Detailed explanations to improve writing skills',
        icon: '📚'
      },
      {
        value: 'quick_review',
        label: 'Quick Review',
        description: 'Fast turnaround with essential improvements only',
        icon: '⚡'
      }
    ]
  }
};

// Workflow recommendation logic
const generateWorkflowRecommendation = (editDepth, userGoals, analysisResult) => {
  // Pro Edit recommendation logic
  if (userGoals.includes('pro_quality') || editDepth === 'early_draft') {
    return {
      workflow: 'pro',
      confidence: 95,
      reason: 'Comprehensive professional editing across all levels',
      phases: ['assessment', 'developmental', 'structural', 'line', 'copy', 'proof', 'complete'],
      estimatedTime: '45-60 minutes',
      description: 'Full professional publishing workflow with developmental, structural, line, copy, and proof editing.'
    };
  }
  
  // Macro Edit recommendation logic  
  if (userGoals.includes('macro_feedback') || userGoals.includes('learning_focused')) {
    return {
      workflow: 'macro',
      confidence: 90,
      reason: 'Focus on big-picture feedback and editorial guidance',
      phases: ['assessment', 'general', 'recommendations'],
      estimatedTime: '15-25 minutes',
      description: 'High-level editorial review with strategic recommendations for next steps.'
    };
  }
  
  // Micro Edit recommendation logic
  if (userGoals.includes('micro_polish') || editDepth === 'near_final') {
    return {
      workflow: 'micro',
      confidence: 85,
      reason: 'Focused on sentence-level clarity and correctness',
      phases: ['assessment', 'line', 'copy', 'proof', 'complete'], 
      estimatedTime: '20-35 minutes',
      description: 'Line editing, copy editing, and proofreading for polished manuscripts.'
    };
  }
  
  // Quick Review recommendation
  if (userGoals.includes('quick_review')) {
    return {
      workflow: 'macro',
      confidence: 80,
      reason: 'Fast high-level review for immediate insights',
      phases: ['assessment', 'general'],
      estimatedTime: '10-15 minutes', 
      description: 'Quick editorial overview with priority recommendations.'
    };
  }
  
  // Default to Pro Edit for comprehensive coverage
  return {
    workflow: 'pro',
    confidence: 75,
    reason: 'Comprehensive approach ensures all editing needs are addressed',
    phases: ['assessment', 'developmental', 'structural', 'line', 'copy', 'proof', 'complete'],
    estimatedTime: '45-60 minutes',
    description: 'Full professional editing workflow recommended for thorough manuscript development.'
  };
};

// Assessment analysis component
function AssessmentAnalysis({ 
  text = '', 
  isAnalyzing = false, 
  analysisResult = null 
}) {
  if (isAnalyzing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <div className="font-semibold text-blue-800">Analyzing your manuscript...</div>
            <div className="text-sm text-blue-600">Lulu is assessing editing needs and manuscript complexity</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!analysisResult) return null;
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="font-bold text-green-800 mb-3">📊 Manuscript Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-gray-700">Word Count:</div>
          <div>{analysisResult.wordCount?.toLocaleString() || 'Unknown'}</div>
        </div>
        
        <div>
          <div className="font-semibold text-gray-700">Complexity Level:</div>
          <div className="flex items-center gap-1">
            <span>{analysisResult.complexity || 'Medium'}</span>
            <span className="text-xs text-gray-500">
              ({analysisResult.readingLevel || 'Grade 8-10'})
            </span>
          </div>
        </div>
        
        <div>
          <div className="font-semibold text-gray-700">Primary Needs:</div>
          <div>{analysisResult.primaryNeeds?.join(', ') || 'Structure, Clarity'}</div>
        </div>
        
        <div>
          <div className="font-semibold text-gray-700">Draft Stage:</div>
          <div>{analysisResult.draftStage || 'Revision Ready'}</div>
        </div>
      </div>
      
      {analysisResult.insights && (
        <div className="mt-3 p-3 bg-white rounded border-l-4 border-green-400">
          <div className="font-semibold text-gray-700 text-sm">Key Insights:</div>
          <div className="text-sm text-gray-600 mt-1">{analysisResult.insights}</div>
        </div>
      )}
    </div>
  );
}

// Workflow recommendation display
function WorkflowRecommendation({ 
  recommendation, 
  onAccept, 
  onCustomize,
  showAlternatives = true 
}) {
  const workflowIcons = {
    pro: '🏆',
    macro: '🖼️', 
    micro: '✨',
    custom: '⚙️'
  };
  
  const confidenceColor = recommendation.confidence >= 90 ? 'green' : 
                         recommendation.confidence >= 75 ? 'blue' : 'yellow';
  
  return (
    <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2">
            {workflowIcons[recommendation.workflow]} 
            {recommendation.workflow.charAt(0).toUpperCase() + recommendation.workflow.slice(1)} Edit Recommended
          </h3>
          <div className="text-sm text-gray-600 mt-1">
            {recommendation.estimatedTime} • {recommendation.phases.length} phases
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${confidenceColor}-100 text-${confidenceColor}-800`}>
          {recommendation.confidence}% match
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-gray-700 mb-2">{recommendation.description}</div>
        <div className="text-sm text-gray-600">
          <strong>Why this workflow:</strong> {recommendation.reason}
        </div>
      </div>
      
      {/* Workflow phases preview */}
      <div className="mb-6">
        <div className="font-semibold text-gray-700 mb-2">Workflow Phases:</div>
        <div className="flex flex-wrap gap-2">
          {recommendation.phases.map((phase, index) => (
            <div key={phase} className="flex items-center">
              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </span>
              {index < recommendation.phases.length - 1 && (
                <span className="text-gray-400 mx-1">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onAccept(recommendation.workflow)}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Start {recommendation.workflow.charAt(0).toUpperCase() + recommendation.workflow.slice(1)} Edit
        </button>
        
        <button
          onClick={onCustomize}
          className="px-4 py-3 border border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold rounded-lg transition-colors"
        >
          Customize
        </button>
      </div>
      
      {/* Alternative workflows */}
      {showAlternatives && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <strong>Other options:</strong> Pro Edit for comprehensive editing, Macro Edit for big-picture feedback, 
            Micro Edit for line-level polish, or create a Custom Edit workflow.
          </div>
        </div>
      )}
    </div>
  );
}

// Main assessment component
export default function WorkflowAssessment({
  // Assessment state
  editDepth = '',
  userGoals = [],
  writerNotes = '',
  
  // Analysis state  
  text = '',
  isAnalyzing = false,
  analysisResult = null,
  
  // Recommendation state
  recommendation = null,
  
  // Handlers
  onEditDepthChange = () => {},
  onUserGoalsChange = () => {},
  onWriterNotesChange = () => {},
  onStartAnalysis = () => {},
  onAcceptRecommendation = () => {},
  onCustomizeWorkflow = () => {},
  
  // UI options
  showAnalysis = true,
  showWriterNotes = true,
  compact = false
}) {

  const [localGoals, setLocalGoals] = useState(userGoals);
  const [showRecommendation, setShowRecommendation] = useState(false);

  // Auto-generate recommendation when assessment is complete
  useEffect(() => {
    if (editDepth && localGoals.length > 0 && !isAnalyzing) {
      const newRecommendation = generateWorkflowRecommendation(editDepth, localGoals, analysisResult);
      setShowRecommendation(true);
      
      // Call parent handler if provided
      if (typeof onAcceptRecommendation === 'function') {
        // Don't auto-accept, just prepare the recommendation
      }
    }
  }, [editDepth, localGoals, analysisResult, isAnalyzing]);

  // Handle goal selection (multi-select)
  const handleGoalToggle = (goalValue) => {
    const updatedGoals = localGoals.includes(goalValue)
      ? localGoals.filter(g => g !== goalValue)
      : [...localGoals, goalValue];
    
    setLocalGoals(updatedGoals);
    onUserGoalsChange(updatedGoals);
  };

  // Handle manual analysis trigger
  const handleAnalyzeManuscript = () => {
    if (text.trim().length < 100) {
      alert('Please enter at least 100 characters for analysis.');
      return;
    }
    
    onStartAnalysis(text);
  };

  // Check if assessment is complete
  const isAssessmentComplete = editDepth && localGoals.length > 0;

  if (compact) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-lg mb-3">🎯 Quick Setup</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manuscript stage:
            </label>
            <select 
              value={editDepth} 
              onChange={(e) => onEditDepthChange(e.target.value)}
              className="w-full p-2 border rounded focus:border-purple-400"
            >
              <option value="">Select stage...</option>
              {ASSESSMENT_QUESTIONS.editDepth.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary goal:
            </label>
            <select 
              value={localGoals[0] || ''} 
              onChange={(e) => onUserGoalsChange([e.target.value])}
              className="w-full p-2 border rounded focus:border-purple-400"
            >
              <option value="">Select goal...</option>
              {ASSESSMENT_QUESTIONS.userGoals.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-800 mb-2">🎯 Editing Assessment</h2>
        <p className="text-gray-600">
          Let's determine the best editing approach for your manuscript
        </p>
      </div>

      {/* Edit Depth Selection */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {ASSESSMENT_QUESTIONS.editDepth.title}
        </h3>
        <p className="text-gray-600 mb-4">{ASSESSMENT_QUESTIONS.editDepth.subtitle}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ASSESSMENT_QUESTIONS.editDepth.options.map(option => (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${editDepth === option.value 
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <input
                type="radio"
                name="editDepth"
                value={option.value}
                checked={editDepth === option.value}
                onChange={(e) => onEditDepthChange(e.target.value)}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  <span className="text-lg">{option.icon}</span>
                  {option.label}
                </div>
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* User Goals Selection */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          {ASSESSMENT_QUESTIONS.userGoals.title}
        </h3>
        <p className="text-gray-600 mb-4">{ASSESSMENT_QUESTIONS.userGoals.subtitle}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ASSESSMENT_QUESTIONS.userGoals.options.map(option => (
            <label
              key={option.value}
              className={`
                flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                ${localGoals.includes(option.value)
                  ? 'border-purple-400 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <input
                type="checkbox"
                value={option.value}
                checked={localGoals.includes(option.value)}
                onChange={() => handleGoalToggle(option.value)}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  <span className="text-lg">{option.icon}</span>
                  {option.label}
                </div>
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Writer's Notes (Optional) */}
      {showWriterNotes && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">📝 Additional Notes</h3>
          <p className="text-gray-600 mb-4">
            Any specific editing requests or areas you'd like Lulu to focus on?
          </p>
          
          <textarea
            value={writerNotes}
            onChange={(e) => onWriterNotesChange(e.target.value)}
            placeholder="e.g., 'Focus on dialogue clarity' or 'Help with pacing in chapter 3'..."
            className="w-full p-3 border rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            rows={3}
          />
        </div>
      )}

      {/* Manuscript Analysis */}
      {showAnalysis && editDepth === 'unknown' && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">🔍 Manuscript Analysis</h3>
          <p className="text-gray-600 mb-4">
            Lulu will analyze your manuscript to determine the best editing approach
          </p>
          
          {!isAnalyzing && !analysisResult && (
            <button
              onClick={handleAnalyzeManuscript}
              disabled={text.trim().length < 100}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Analyze Manuscript
            </button>
          )}
          
          <AssessmentAnalysis 
            text={text}
            isAnalyzing={isAnalyzing}
            analysisResult={analysisResult}
          />
        </div>
      )}

      {/* Workflow Recommendation */}
      {isAssessmentComplete && !isAnalyzing && (
        <WorkflowRecommendation
          recommendation={generateWorkflowRecommendation(editDepth, localGoals, analysisResult)}
          onAccept={onAcceptRecommendation}
          onCustomize={onCustomizeWorkflow}
        />
      )}
    </div>
  );
}