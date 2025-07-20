// /components/CascadeController.jsx
// MASTER WORKFLOW ORCHESTRATOR: Handles Professional Publishing Cascade Logic

import React, { useState, useEffect } from 'react';
import { getEditMeta } from '../utils/editorConfig';

// Edit level hierarchy with cascade rules
const EDIT_LEVELS = {
  general: { 
    priority: 1, 
    color: 'purple', 
    output: 'roadmap', 
    cascadesTo: ['developmental'],
    name: 'General Analysis'
  },
  developmental: { 
    priority: 2, 
    color: 'blue', 
    output: 'specific_suggestions', 
    cascadesTo: ['structural', 'line', 'copy'], // Dev cascades to Str/Line/Copy
    name: 'Developmental'
  },
  structural: { 
    priority: 3, 
    color: 'green', 
    cascadesTo: ['line', 'copy'], // Str cascades to Line/Copy
    name: 'Structural'
  },
  line: { 
    priority: 4, 
    color: 'orange', 
    cascadesTo: ['copy'], // Line cascades to Copy
    name: 'Line'
  },
  copy: { 
    priority: 5, 
    color: 'red', 
    cascadesTo: ['proof'], // Copy cascades to Proof
    name: 'Copy'
  },
  proof: { 
    priority: 6, 
    color: 'gray', 
    cascadesTo: [], // Final level
    name: 'Proof'
  }
};

// Workflow definitions matching your design document
const WORKFLOWS = {
  pro: {
    name: 'Pro Edit',
    description: 'Full professional publishing workflow',
    phases: ['assessment', 'developmental', 'structural', 'line', 'copy', 'proof', 'complete'],
    requiresRecontextualization: true
  },
  macro: {
    name: 'Macro Edit', 
    description: 'High-level editorial review and recommendations',
    phases: ['assessment', 'general', 'recommendations'],
    requiresRecontextualization: false
  },
  micro: {
    name: 'Micro Edit',
    description: 'Line, copy and proof editing only', 
    phases: ['assessment', 'line', 'copy', 'proof', 'complete'],
    requiresRecontextualization: true
  },
  custom: {
    name: 'Custom Edit',
    description: 'User-selected editing levels',
    phases: [], // Dynamically set based on user selection
    requiresRecontextualization: true
  }
};

export default function CascadeController({
  // Workflow state
  currentWorkflow = 'pro',
  currentPhase = 'assessment',
  selectedEditTypes = [],
  
  // Editing data
  suggestions = {},
  specificEdits = [],
  text = '',
  
  // Cascade handlers
  onPhaseChange = () => {},
  onCascadeEdit = () => {},
  onRecontextualize = () => {},
  onWorkflowComplete = () => {},
  
  // UI state
  isProcessing = false,
  cascadeQueue = [],
  
  // Debug
  debug = false
}) {

  // Internal state for cascade management
  const [pendingCascades, setPendingCascades] = useState([]);
  const [recontextQueue, setRecontextQueue] = useState([]);
  const [completedLevels, setCompletedLevels] = useState(new Set());
  const [workflowProgress, setWorkflowProgress] = useState({});

  // Debug logging
  useEffect(() => {
    if (debug) {
      console.log('🎯 CascadeController state:', {
        currentWorkflow,
        currentPhase,
        selectedEditTypes,
        pendingCascades: pendingCascades.length,
        recontextQueue: recontextQueue.length,
        completedLevels: Array.from(completedLevels)
      });
    }
  }, [currentWorkflow, currentPhase, pendingCascades, recontextQueue, completedLevels, debug]);

  // CORE FUNCTION: Handle edit acceptance with cascade logic
  const handleEditAcceptance = async (editType, editIndex, editData) => {
    if (debug) {
      console.log('✅ Edit accepted - triggering cascade:', { editType, editIndex, editData });
    }

    const level = EDIT_LEVELS[editType.toLowerCase()];
    if (!level) {
      console.warn('⚠️ Unknown edit type for cascade:', editType);
      return;
    }

    // Generate cascade edits for lower levels
    if (level.cascadesTo && level.cascadesTo.length > 0) {
      const cascadeData = {
        sourceEdit: editData,
        sourceLevel: editType.toLowerCase(),
        targetLevels: level.cascadesTo,
        originalText: text,
        timestamp: Date.now()
      };

      setPendingCascades(prev => [...prev, cascadeData]);
      
      // Trigger cascade generation
      await generateCascadeEdits(cascadeData);
    }

    // Mark level as having activity
    setCompletedLevels(prev => new Set([...prev, editType.toLowerCase()]));
    
    // Check if recontextualization needed
    if (shouldRecontextualize(editType)) {
      scheduleRecontextualization(editType);
    }

    // Update progress
    updateWorkflowProgress();
  };

  // CORE FUNCTION: Generate cascade edits via API
  const generateCascadeEdits = async (cascadeData) => {
    try {
      if (debug) {
        console.log('🔄 Generating cascade edits:', cascadeData);
      }

      const response = await fetch('/api/cascade-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceEdit: cascadeData.sourceEdit,
          sourceLevel: cascadeData.sourceLevel,
          targetLevels: cascadeData.targetLevels,
          originalText: cascadeData.originalText,
          context: {
            workflow: currentWorkflow,
            phase: currentPhase,
            existingSuggestions: suggestions,
            specificEdits: specificEdits
          }
        })
      });

      const cascadeResult = await response.json();
      
      if (response.ok) {
        // Notify parent component of new cascade edits
        onCascadeEdit(cascadeResult.cascadeEdits, cascadeData.targetLevels);
        
        // Remove from pending queue
        setPendingCascades(prev => 
          prev.filter(p => p.timestamp !== cascadeData.timestamp)
        );

        if (debug) {
          console.log('✅ Cascade edits generated:', cascadeResult.cascadeEdits);
        }
      } else {
        console.error('❌ Cascade generation failed:', cascadeResult.error);
      }

    } catch (error) {
      console.error('❌ Cascade generation error:', error);
    }
  };

  // CORE FUNCTION: Determine if recontextualization needed
  const shouldRecontextualize = (completedLevel) => {
    const workflow = WORKFLOWS[currentWorkflow];
    if (!workflow.requiresRecontextualization) return false;

    // Recontextualize after completing each major level
    const majorLevels = ['developmental', 'structural', 'line', 'copy'];
    return majorLevels.includes(completedLevel.toLowerCase());
  };

  // CORE FUNCTION: Schedule recontextualization
  const scheduleRecontextualization = (completedLevel) => {
    const recontextData = {
      completedLevel: completedLevel.toLowerCase(),
      remainingText: text,
      completedEdits: completedLevels,
      timestamp: Date.now()
    };

    setRecontextQueue(prev => [...prev, recontextData]);
    
    // Auto-trigger recontextualization after brief delay
    setTimeout(() => {
      performRecontextualization(recontextData);
    }, 500);
  };

  // CORE FUNCTION: Perform GPT recontextualization
  const performRecontextualization = async (recontextData) => {
    try {
      if (debug) {
        console.log('🔄 Performing recontextualization:', recontextData);
      }

      const response = await fetch('/api/cascade-handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recontextualize',
          completedLevel: recontextData.completedLevel,
          remainingText: recontextData.remainingText,
          existingSuggestions: suggestions,
          specificEdits: specificEdits,
          context: {
            workflow: currentWorkflow,
            completedLevels: Array.from(completedLevels)
          }
        })
      });

      const recontextResult = await response.json();
      
      if (response.ok) {
        // Notify parent component of recontextualized suggestions
        onRecontextualize(recontextResult.updatedSuggestions);
        
        // Remove from recontextualization queue
        setRecontextQueue(prev => 
          prev.filter(r => r.timestamp !== recontextData.timestamp)
        );

        if (debug) {
          console.log('✅ Recontextualization complete:', recontextResult);
        }
      } else {
        console.error('❌ Recontextualization failed:', recontextResult.error);
      }

    } catch (error) {
      console.error('❌ Recontextualization error:', error);
    }
  };

  // WORKFLOW MANAGEMENT: Update progress tracking
  const updateWorkflowProgress = () => {
    const workflow = WORKFLOWS[currentWorkflow];
    const totalPhases = workflow.phases.length;
    const currentPhaseIndex = workflow.phases.indexOf(currentPhase);
    
    const progress = {
      workflow: currentWorkflow,
      currentPhase,
      currentPhaseIndex,
      totalPhases,
      percentComplete: totalPhases > 0 ? Math.round((currentPhaseIndex / totalPhases) * 100) : 0,
      completedLevels: Array.from(completedLevels),
      pendingCascades: pendingCascades.length,
      recontextualizing: recontextQueue.length > 0
    };

    setWorkflowProgress(progress);
  };

  // WORKFLOW MANAGEMENT: Advance to next phase
  const advancePhase = () => {
    const workflow = WORKFLOWS[currentWorkflow];
    const currentIndex = workflow.phases.indexOf(currentPhase);
    
    if (currentIndex < workflow.phases.length - 1) {
      const nextPhase = workflow.phases[currentIndex + 1];
      onPhaseChange(nextPhase);
      
      if (debug) {
        console.log('📈 Advanced to next phase:', nextPhase);
      }
    } else {
      // Workflow complete
      onWorkflowComplete(workflowProgress);
      
      if (debug) {
        console.log('🎉 Workflow complete!', currentWorkflow);
      }
    }
  };

  // WORKFLOW MANAGEMENT: Check if current phase is complete
  const isPhaseComplete = () => {
    const workflow = WORKFLOWS[currentWorkflow];
    
    switch (currentPhase) {
      case 'assessment':
        return selectedEditTypes.length > 0;
      
      case 'developmental':
        return hasAllEditsProcessed('developmental');
      
      case 'structural':
        return hasAllEditsProcessed('structural');
      
      case 'line':
        return hasAllEditsProcessed('line');
      
      case 'copy':
        return hasAllEditsProcessed('copy');
      
      case 'proof':
        return hasAllEditsProcessed('proof');
      
      case 'general':
        return hasAllEditsProcessed('general');
      
      default:
        return false;
    }
  };

  // HELPER: Check if all edits for a level are processed
  const hasAllEditsProcessed = (level) => {
    if (level === 'general') {
      const generalSuggestions = suggestions[level] || [];
      return generalSuggestions.every(s => ['accepted', 'rejected', 'revised'].includes(s.state));
    } else {
      const levelEdits = specificEdits.filter(e => 
        e.editType?.toLowerCase() === level.toLowerCase()
      );
      return levelEdits.length > 0 && 
             levelEdits.every(e => ['accepted', 'rejected', 'revised'].includes(e.state));
    }
  };

  // Update progress whenever dependencies change
  useEffect(() => {
    updateWorkflowProgress();
  }, [currentWorkflow, currentPhase, completedLevels, pendingCascades, recontextQueue]);

  // Auto-advance phase when current phase is complete
  useEffect(() => {
    if (isPhaseComplete() && pendingCascades.length === 0 && recontextQueue.length === 0) {
      // Small delay to allow UI updates
      setTimeout(() => {
        advancePhase();
      }, 1000);
    }
  }, [currentPhase, pendingCascades, recontextQueue, suggestions, specificEdits]);

  // EXPOSED METHODS: For parent component control
  const cascadeController = {
    handleEditAcceptance,
    advancePhase,
    shouldRecontextualize,
    isPhaseComplete,
    getWorkflowProgress: () => workflowProgress,
    getPendingCascades: () => pendingCascades,
    getRecontextQueue: () => recontextQueue,
    
    // Workflow control methods
    setWorkflow: (workflow) => {
      if (WORKFLOWS[workflow]) {
        onPhaseChange(WORKFLOWS[workflow].phases[0]); // Reset to first phase
        setPendingCascades([]);
        setRecontextQueue([]);
        setCompletedLevels(new Set());
      }
    },
    
    // Manual controls for debugging/testing
    forceRecontextualization: (level) => scheduleRecontextualization(level),
    clearCascadeQueue: () => setPendingCascades([]),
    clearRecontextQueue: () => setRecontextQueue([])
  };

  // Expose controller methods to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.luluCascadeController = cascadeController;
    }
  }, [workflowProgress, pendingCascades, recontextQueue]);

  // UI COMPONENT: Visual cascade status (optional)
  if (debug) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-bold text-blue-800 mb-2">🎯 Cascade Controller Debug</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold">Workflow Progress:</div>
            <div>Phase: {workflowProgress.currentPhase}</div>
            <div>Progress: {workflowProgress.percentComplete}%</div>
            <div>Completed: {workflowProgress.completedLevels?.join(', ') || 'None'}</div>
          </div>
          
          <div>
            <div className="font-semibold">Cascade Status:</div>
            <div>Pending Cascades: {pendingCascades.length}</div>
            <div>Recontextualizing: {recontextQueue.length}</div>
            <div>Phase Complete: {isPhaseComplete() ? '✅' : '❌'}</div>
          </div>
        </div>

        {pendingCascades.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 rounded">
            <div className="font-semibold text-yellow-800">Pending Cascades:</div>
            {pendingCascades.map((cascade, idx) => (
              <div key={idx} className="text-xs text-yellow-700">
                {cascade.sourceLevel} → {cascade.targetLevels.join(', ')}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Return controller object for external use
  return cascadeController;
}

// EXPORT: Available workflows and levels for external use
export { EDIT_LEVELS, WORKFLOWS };