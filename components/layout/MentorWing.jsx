/**
 * MentorWing - Controlled editorial guidance space for the Writer's Desk
 * 
 * CHANGES MADE:
 * - Removed local view state that conflicted with global currentPhase
 * - Made component fully controlled by currentPhase prop from parent
 * - Added minimal local state only for temporary UI states (showPlanner)
 * - Component now automatically responds to global workflow state changes
 * - Simplified logic: derives display from props, not internal state
 * - FIXED: Reordered conditional logic to prioritize global state over temporary UI states
 * 
 * Philosophy: This is now a "dumb" component that reacts to global state,
 * eliminating state synchronization conflicts. Global workflow phases always
 * take precedence over temporary UI states.
 */

import React, { useState, useCallback } from 'react';
import ConsultationMenu from '../mentor/ConsultationMenu';
import EditorialPlanner from '../EditorialPlanner';
import SpecificEditsPanel from '../SpecificEditsPanel';
import PolishStudio from '../PolishStudio';
import SuggestionConflictCard from '../SuggestionConflictCard';
import StrategyCard from '../StrategyCard';

const SUBSTANTIVE_PHASES = ['developmental', 'structural'];
const SENTENCE_LEVEL_PHASES = ['line', 'copy', 'proof'];

const MentorWing = ({ 
    manuscriptText, 
    actions, 
    currentPhase,
    isProcessing,
    suggestions,
    activeConflictGroup,
    onAcceptChoice,
    onRejectChoice,
    getEditMeta,
    // Additional props needed for substantive phases
    currentGoal,
    goalEdits,
    isFetchingEdits,
    currentGoalIndex,
    substantiveGoals,
    onGoalComplete,
    // Additional props needed for EditorialPlanner
    editorialPlan,
    error,
    // Focus Edit control props (presentational only)
    isFocusEditActive,
    isFocusEditProcessing,
    onConsultationSelect,
    onResetFocusEdit,
    initialManuscriptText,
    onApplyWithLulu,
    className = "" 
}) => {
    // Only local state needed: temporary UI states
    const [showPlanner, setShowPlanner] = useState(false);

    // Reset temporary states
    const handleResetToMenu = useCallback(() => {
        setShowPlanner(false);
        if (onResetFocusEdit) onResetFocusEdit();
    }, [onResetFocusEdit]);

    // Local wrapper to route menu selections:
    // - focusEdit → delegate to parent via onConsultationSelect
    // - deepDive/editorialReport → handled locally (UI-only)
    const handleMenuSelect = useCallback((consultationType) => {
        if (consultationType === 'focusEdit') {
            if (onConsultationSelect) onConsultationSelect('focusEdit');
            return;
        }
        if (consultationType === 'deepDive' || consultationType === 'editorialReport') {
            setShowPlanner(true);
            return;
        }
        console.warn('Unknown consultation type:', consultationType);
    }, [onConsultationSelect]);

    // Back button for temporary states
    const renderBackButton = () => (
        <button
            onClick={handleResetToMenu}
            className="mb-4 flex items-center text-green-700 hover:text-green-800 transition-colors"
        >
            <span className="mr-2">←</span>
            Back to Consultation Menu
        </button>
    );

    // MAIN RENDER LOGIC: Global state takes precedence over temporary UI states
    
    // 1. Focus Edit temporary state (unchanged)
    if (isFocusEditActive) {
        return (
            <div className={`h-full ${className}`}>
                <div className="p-6">
                    {renderBackButton()}
                    
                    <h3 className="text-xl font-bold text-blue-800 mb-4">
                        ✨ Polish Studio
                    </h3>
                    
                    <p className="text-sm text-blue-600 mb-4">
                        Quick polish for line-level and copy improvements.
                    </p>
                    
                    {isFocusEditProcessing ? (
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">⏳</div>
                            <p className="text-lg font-semibold animate-pulse text-blue-700">
                                Analyzing for line and copy improvements...
                            </p>
                            <p className="text-sm text-blue-600 mt-2">
                                Generating focused suggestions
                            </p>
                        </div>
                    ) : activeConflictGroup ? (
                        <div>
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Conflicting suggestions detected.</strong> Please choose the best option.
                                </p>
                            </div>
                            <SuggestionConflictCard conflictGroup={activeConflictGroup} onAccept={onAcceptChoice} />
                        </div>
                    ) : (
                        <PolishStudio
                            suggestions={suggestions}
                            onAccept={onAcceptChoice}
                            onReject={onRejectChoice}
                            onRevise={() => {}}
                            getEditMeta={getEditMeta}
                            initialText={initialManuscriptText || manuscriptText}
                            finalText={manuscriptText}
                            onApplyWithLulu={onApplyWithLulu}
                        />
                    )}
                </div>
            </div>
        );
    }

    // 2. PRIORITY: Global workflow phases take precedence over temporary states
    if (SUBSTANTIVE_PHASES.includes(currentPhase)) {
        return (
            <div className={`h-full ${className}`}>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-green-800 mb-4">
                        🎯 {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edit 
                        ({currentGoalIndex !== null ? currentGoalIndex + 1 : 1} of {substantiveGoals?.length || 0})
                    </h3>
                    {currentGoal ? (
                        <StrategyCard
                            key={currentGoal.id}
                            goal={currentGoal}
                            edits={suggestions || []}
                            isLoading={isFetchingEdits || goalEdits[currentGoal.id]?.status === 'loading'}
                            onComplete={onGoalComplete}
                            onAccept={onAcceptChoice}
                            onReject={onRejectChoice}
                            getEditMeta={getEditMeta}
                        />
                    ) : (
                        <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-4xl mb-4">✅</div>
                            <p className="text-lg font-semibold text-green-800 mb-3">All substantive goals completed!</p>
                            <p className="text-sm text-green-600 mb-4">Ready to proceed to the next editing phase.</p>
                            <button 
                                onClick={() => actions.completeCurrentPhase()} 
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                            >
                                Proceed to Next Phase
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (SENTENCE_LEVEL_PHASES.includes(currentPhase)) {
        return (
            <div className={`h-full ${className}`}>
                <div className="p-6">
                    <h3 className="text-xl font-bold text-green-800 mb-4">
                        ✏️ {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} Edits
                    </h3>
                    {isProcessing ? (
                        <div className="text-center p-8">
                            <div className="text-4xl mb-4">⏳</div>
                            <p className="text-lg font-semibold animate-pulse text-green-700">Analyzing your manuscript...</p>
                            <p className="text-sm text-green-600 mt-2">Generating personalized suggestions</p>
                        </div>
                    ) : activeConflictGroup ? (
                        <div>
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Conflicting suggestions detected.</strong> Please choose the best option.
                                </p>
                            </div>
                            <SuggestionConflictCard conflictGroup={activeConflictGroup} onAccept={onAcceptChoice} />
                        </div>
                    ) : (
                        <SpecificEditsPanel 
                            suggestions={suggestions} 
                            onAccept={onAcceptChoice} 
                            onReject={onRejectChoice} 
                            onRevise={() => {}} 
                            getEditMeta={getEditMeta}
                            simpleMode={true}
                        />
                    )}
                </div>
            </div>
        );
    }

    // 3. Assessment phase with temporary planner state
    if (currentPhase === 'assessment') {
        if (showPlanner) {
    return (
        <div className={`h-full ${className}`}>
                    <div className="p-6">
                        {renderBackButton()}
                        
                        <h3 className="text-xl font-bold text-green-800 mb-4">
                            🔍 Deep Dive Assessment
                        </h3>
                        
                        <EditorialPlanner 
                            manuscriptText={manuscriptText} 
                            editorialPlan={editorialPlan}
                            isProcessing={isProcessing}
                            error={error}
                            actions={actions}
                        />
            </div>
                </div>
            );
        } else {
            // Default menu for assessment phase
            return (
                <div className={`h-full ${className}`}>
                    <ConsultationMenu onSelect={handleMenuSelect} isProcessing={isProcessing || isFocusEditProcessing} />
                </div>
            );
        }
    }

    // Fallback: show consultation menu
    return (
        <div className={`h-full ${className}`}>
            <ConsultationMenu onSelect={handleMenuSelect} isProcessing={isProcessing || isFocusEditProcessing} />
        </div>
    );
};

export default MentorWing; 