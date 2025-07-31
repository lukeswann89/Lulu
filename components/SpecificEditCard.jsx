/**
 * SpecificEditCard - Canonical component for displaying suggestion edits
 * 
 * CHANGES MADE:
 * - Created definitive SpecificEditCard component with consistent styling
 * - Implements red strikethrough for original text and green for suggested text
 * - Supports both ProseMirror integration (with positions) and standalone display
 * - Handles accept/reject actions with proper callback integration
 * - Standardized design for use across StrategyCard and SpecificEditsPanel
 * 
 * Philosophy: Single source of truth for suggestion card UI, ensuring
 * consistent user experience throughout the application.
 */

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function SpecificEditCard({ 
    edit, 
    index, 
    onAccept, 
    onReject, 
    onRevise,
    getEditMeta,
    isResolved = false,
    className = ""
}) {
    // Handle resolved state display
    if (isResolved) {
        return (
            <div className={`flex items-center gap-3 p-3 bg-green-50 text-green-800 border border-green-200 rounded-md transition-all ${className}`}>
                <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                <span className="text-sm font-medium">Suggestion resolved.</span>
            </div>
        );
    }

    // Get edit metadata for styling
    const meta = getEditMeta ? getEditMeta(edit.editType || edit.type || 'Other') : null;
    const severity = edit.severity || 'Suggested';
    
    // Handle accept action
    const handleAccept = () => {
        if (!edit.id) {
            console.error('[REACT] CRITICAL: Edit object missing canonical ID!', edit);
            return;
        }
        console.log(`[REACT] SpecificEditCard.handleAccept: Sending canonical ID="${edit.id}"`);
        if (onAccept) {
            onAccept(edit.id, edit);
        }
    };

    // Handle reject action  
    const handleReject = () => {
        if (!edit.id) {
            console.error('[REACT] CRITICAL: Edit object missing canonical ID for reject!', edit);
            return;
        }
        if (onReject) {
            onReject(edit.id, edit);
        }
    };

    // Handle revise action
    const handleRevise = () => {
        if (!edit.id) {
            console.error('[REACT] CRITICAL: Edit object missing canonical ID for revise!', edit);
            return;
        }
        if (onRevise) {
            onRevise(edit.id, edit);
        }
    };

    return (
        <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm animate-fade-in-up ${className}`}>
            {/* Edit Type and Severity */}
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-700">
                    {severity === 'Critical' ? '🚨 Critical Edit' : '✏️ Suggested Edit'}
                </p>
                {meta && (
                    <span className={`text-xs px-2 py-1 rounded-full ${meta.color} ${meta.iconColor} font-medium`}>
                        {meta.icon} {meta.type}
                    </span>
                )}
            </div>

            {/* Original and Suggested Text - Simple styling like screenshot 1 */}
            <div className="my-2 text-sm space-y-1">
                {edit.original && (
                    <p><span className="font-bold text-red-600 line-through decoration-2">{edit.original}</span></p>
                )}
                {edit.suggestion && (
                    <p><span className="font-bold text-green-600">{edit.suggestion}</span></p>
                )}
            </div>

            {/* Explanation - Simple italic text */}
            {edit.why && (
                <p className="text-xs text-gray-600 italic">"{edit.why}"</p>
            )}

            {/* Action Buttons - Always include Revise button */}
            <div className="flex gap-2 mt-3">
                <button 
                    onClick={handleAccept}
                    className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200"
                >
                    Accept
                </button>
                <button 
                    onClick={handleReject}
                    className="text-xs font-semibold bg-red-100 text-red-800 px-3 py-1 rounded-full hover:bg-red-200"
                >
                    Reject
                </button>
                <button 
                    onClick={handleRevise}
                    className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200"
                    disabled={!onRevise}
                >
                    Revise
                </button>
            </div>

            {/* Debug Info (Development Only) */}
            {process.env.NODE_ENV === 'development' && edit.from !== undefined && edit.to !== undefined && (
                <div className="mt-2 text-xs text-gray-400 font-mono">
                    Position: {edit.from}-{edit.to}
                </div>
            )}
        </div>
    );
}