// /hooks/useEditingWorkflow.js
// WORKFLOW MANAGEMENT HOOK: Cascade logic, workflow phases, assessment state

import { useState, useEffect, useRef } from 'react';
import { WORKFLOWS } from '../components/CascadeController';

export function useEditingWorkflow() {
  // --- CASCADE STATE ---
  const [currentWorkflow, setCurrentWorkflow] = useState('pro'); // 'pro', 'macro', 'micro', 'custom'
  const [currentPhase, setCurrentPhase] = useState('assessment'); // Current workflow phase
  const [workflowPhases, setWorkflowPhases] = useState(['assessment']); // Dynamic phases based on workflow
  const [isProcessingCascade, setIsProcessingCascade] = useState(false);
  const [pendingCascades, setPendingCascades] = useState([]);
  const [recontextualizing, setRecontextualizing] = useState(false);
  const [completedLevels, setCompletedLevels] = useState(new Set());
  
  // --- ASSESSMENT STATE ---
  const [assessmentEditDepth, setAssessmentEditDepth] = useState('');
  const [assessmentUserGoals, setAssessmentUserGoals] = useState([]);
  const [assessmentWriterNotes, setAssessmentWriterNotes] = useState('');
  const [isAnalyzingManuscript, setIsAnalyzingManuscript] = useState(false);
  const [manuscriptAnalysis, setManuscriptAnalysis] = useState(null);

  // --- CASCADE CONTROLLER REFERENCE ---
  const cascadeControllerRef = useRef(null);

  // --- WORKFLOW INITIALIZATION ---
  
  // Initialize workflow phases when workflow changes
  useEffect(() => {
    const workflow = WORKFLOWS[currentWorkflow];
    if (workflow) {
      setWorkflowPhases(workflow.phases);
      setCurrentPhase(workflow.phases[0] || 'assessment');
      console.log('🎯 Workflow initialized:', currentWorkflow, workflow.phases);
    }
  }, [currentWorkflow]);

  // --- WORKFLOW PHASE MANAGEMENT ---
  
  const handlePhaseChange = (newPhase) => {
    console.log('📈 Phase change:', currentPhase, '->', newPhase);
    setCurrentPhase(newPhase);
  };

  const advanceToNextPhase = () => {
    const workflow = WORKFLOWS[currentWorkflow];
    if (!workflow) return;
    
    const currentIndex = workflow.phases.indexOf(currentPhase);
    if (currentIndex < workflow.phases.length - 1) {
      const nextPhase = workflow.phases[currentIndex + 1];
      handlePhaseChange(nextPhase);
      console.log('📈 Auto-advanced to:', nextPhase);
      return nextPhase;
    }
    
    return null; // No next phase
  };

  // --- CASCADE HANDLERS ---
  
  const handleCascadeEdit = async (cascadeEdits, targetLevels, updateSpecificEdits, updateAuthorship, updateSessionLog) => {
    console.log('🔄 Handling cascade edits:', cascadeEdits.length, 'for levels:', targetLevels);
    
    // Add cascade edits to specific edits with level grouping
    updateSpecificEdits(prev => {
      const newEdits = [...prev, ...cascadeEdits];
      console.log('📊 Total specific edits after cascade:', newEdits.length);
      return newEdits;
    });

    // Update authorship meter (cascade edits reduce user percentage slightly)
    updateAuthorship(prev => ({
      user: Math.max(0, prev.user - (cascadeEdits.length * 2)),
      lulu: Math.min(100, prev.lulu + (cascadeEdits.length * 2))
    }));

    // Log cascade generation
    updateSessionLog(prev => [...prev, {
      action: 'Cascade Generated',
      newState: `${cascadeEdits.length} edits`,
      context: `Generated ${targetLevels.join(', ')} edits from accepted suggestion`,
      ts: new Date()
    }]);
  };

  const handleRecontextualize = (recontextActions, updateSpecificEdits) => {
    console.log('🔄 Handling recontextualization:', recontextActions.length, 'actions');
    setRecontextualizing(true);

    // Apply recontextualization actions
    setTimeout(() => {
      // Update specific edits based on recontextualization
      updateSpecificEdits(prev => {
        let updatedEdits = [...prev];
        
        if (Array.isArray(recontextActions)) {
          recontextActions.forEach(action => {
            const idx = parseInt(action.suggestionId);
            if (idx >= 0 && idx < updatedEdits.length) {
              if (action.action === 'remove') {
                updatedEdits[idx] = { ...updatedEdits[idx], state: 'removed' };
              } else if (action.action === 'update' && action.updatedSuggestion) {
                updatedEdits[idx] = { ...updatedEdits[idx], ...action.updatedSuggestion };
              }
            }
          });
        }
        
        return updatedEdits.filter(edit => edit.state !== 'removed');
      });

      setRecontextualizing(false);
      console.log('✅ Recontextualization complete');
    }, 1500);
  };

  const handleWorkflowComplete = (workflowProgress, updateSessionLog) => {
    console.log('🎉 Workflow complete!', workflowProgress);
    
    updateSessionLog(prev => [...prev, {
      action: 'Workflow Complete',
      newState: currentWorkflow,
      context: `Completed ${currentWorkflow} edit workflow with ${workflowProgress.percentComplete}% completion`,
      ts: new Date()
    }]);

    // Optional: Show completion modal or redirect
    alert(`🎉 ${currentWorkflow.charAt(0).toUpperCase() + currentWorkflow.slice(1)} Edit Complete!\n\nYour manuscript has been professionally edited.`);
  };

  // --- ASSESSMENT HANDLERS ---

  const handleStartAnalysis = async (manuscriptText) => {
  setIsAnalyzingManuscript(true);
  
  try {
    // Simple client-side analysis for demo
    const wordCount = manuscriptText.trim().split(/\s+/).length;
    const sentences = manuscriptText.split(/[.!?]+/).length;
    const avgWordsPerSentence = Math.round(wordCount / sentences);
    
    // ✅ FIXED: Define complexity here first
    const complexity = avgWordsPerSentence > 20 ? 'High' : avgWordsPerSentence > 15 ? 'Medium' : 'Low';
    const readingLevel = avgWordsPerSentence > 20 ? 'College' : avgWordsPerSentence > 15 ? 'High School' : 'Middle School';
    const draftStage = wordCount > 5000 ? 'Revision Ready' : wordCount > 1000 ? 'Early Draft' : 'Outline';
    
    // ✅ FIXED: Now create analysis object with defined variables
    const analysis = {
      wordCount,
      complexity,
      readingLevel,
      primaryNeeds: ['Structure', 'Clarity', 'Flow'],
      draftStage,
      insights: `This ${wordCount.toLocaleString()}-word manuscript shows ${complexity.toLowerCase()} complexity. Focus areas include narrative flow and character development.`
    };
    
    setTimeout(() => {
      setManuscriptAnalysis(analysis);
      setIsAnalyzingManuscript(false);
    }, 2000);
    
  } catch (error) {
    console.error('Analysis error:', error);
    setIsAnalyzingManuscript(false);
  }
};

  const handleAcceptRecommendation = (workflow, setShowEditOptions) => {
    console.log('✅ Accepted workflow recommendation:', workflow);
    setCurrentWorkflow(workflow);
    setShowEditOptions(false); // Hide options and show editing interface
    
    // Auto-advance from assessment to first editing phase
    setTimeout(() => {
      const workflowConfig = WORKFLOWS[workflow];
      if (workflowConfig && workflowConfig.phases.length > 1) {
        handlePhaseChange(workflowConfig.phases[1]); // Skip assessment phase
      }
    }, 500);
  };

  const handleCustomizeWorkflow = () => {
    console.log('⚙️ Customizing workflow');
    setCurrentWorkflow('custom');
    // Keep in assessment phase for custom configuration
  };

  // --- CASCADE INTEGRATION HELPERS ---

  const triggerCascadeForEdit = (editType, editIndex, editData) => {
    if (cascadeControllerRef.current) {
      cascadeControllerRef.current.handleEditAcceptance(editType, editIndex, editData);
    }
  };

  const getPhaseBasedMode = (phase) => {
    if (phase === 'general' || phase === 'recommendations') {
      return 'General Edits';
    } else if (['developmental', 'structural', 'line', 'copy', 'proof'].includes(phase)) {
      return 'Specific Edits';
    }
    return 'General Edits'; // Default
  };

  // --- WORKFLOW STATUS HELPERS ---

  const isAssessmentPhase = () => currentPhase === 'assessment';
  
  const isEditingPhase = () => !isAssessmentPhase();
  
  const getCurrentModeForPhase = () => getPhaseBasedMode(currentPhase);
  
  const getWorkflowProgress = () => {
    const workflow = WORKFLOWS[currentWorkflow];
    const totalPhases = workflow?.phases?.length || 1;
    const currentPhaseIndex = workflow?.phases?.indexOf(currentPhase) || 0;
    
    return {
      workflow: currentWorkflow,
      currentPhase,
      currentPhaseIndex,
      totalPhases,
      percentComplete: totalPhases > 0 ? Math.round((currentPhaseIndex / totalPhases) * 100) : 0,
      completedLevels: Array.from(completedLevels),
      pendingCascades: pendingCascades.length,
      recontextualizing
    };
  };

  const canTriggerCascade = (editType) => {
    if (currentWorkflow === 'macro') return false; // Macro edits don't cascade
    
    const cascadeEnabledTypes = ['Developmental', 'Structural', 'Line'];
    return cascadeEnabledTypes.includes(editType);
  };

  const getWorkflowTitle = () => {
    const titles = {
      pro: 'Professional Edit',
      macro: 'Macro Edit',
      micro: 'Micro Edit',
      custom: 'Custom Edit'
    };
    
    return titles[currentWorkflow] || 'Professional Edit';
  };

  // --- RESET FUNCTIONS ---

  const resetWorkflow = () => {
    setCurrentWorkflow('pro');
    setCurrentPhase('assessment');
    setWorkflowPhases(['assessment']);
    setIsProcessingCascade(false);
    setPendingCascades([]);
    setRecontextualizing(false);
    setCompletedLevels(new Set());
    resetAssessment();
  };

  const resetAssessment = () => {
    setAssessmentEditDepth('');
    setAssessmentUserGoals([]);
    setAssessmentWriterNotes('');
    setIsAnalyzingManuscript(false);
    setManuscriptAnalysis(null);
  };

  // --- RETURN HOOK INTERFACE ---
  
  return {
    // --- STATE ---
    currentWorkflow,
    currentPhase,
    workflowPhases,
    isProcessingCascade,
    pendingCascades,
    recontextualizing,
    completedLevels,
    
    // Assessment state
    assessmentEditDepth,
    assessmentUserGoals,
    assessmentWriterNotes,
    isAnalyzingManuscript,
    manuscriptAnalysis,
    
    // Refs
    cascadeControllerRef,
    
    // --- SETTERS ---
    setCurrentWorkflow,
    setCurrentPhase,
    setIsProcessingCascade,
    setPendingCascades,
    setRecontextualizing,
    setCompletedLevels,
    
    // Assessment setters
    setAssessmentEditDepth,
    setAssessmentUserGoals,
    setAssessmentWriterNotes,
    setIsAnalyzingManuscript,
    setManuscriptAnalysis,
    
    // --- HANDLERS ---
    handlePhaseChange,
    advanceToNextPhase,
    handleCascadeEdit,
    handleRecontextualize,
    handleWorkflowComplete,
    
    // Assessment handlers
    handleStartAnalysis,
    handleAcceptRecommendation,
    handleCustomizeWorkflow,
    
    // Cascade helpers
    triggerCascadeForEdit,
    
    // --- HELPERS ---
    getPhaseBasedMode,
    getCurrentModeForPhase,
    isAssessmentPhase,
    isEditingPhase,
    getWorkflowProgress,
    canTriggerCascade,
    getWorkflowTitle,
    
    // Reset functions
    resetWorkflow,
    resetAssessment
  };
}