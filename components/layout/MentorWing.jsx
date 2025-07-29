import React from 'react';

/**
 * MentorWing - Editorial guidance space for the Writer's Desk
 * 
 * CHANGES MADE:
 * - Simplified to work with sophisticated WriterDesk headers
 * - Removed redundant header elements (now handled by parent)
 * - Focused on clean content wrapping for existing editing workflow
 * - Streamlined for integration with the "One Wing" rule system
 * 
 * Philosophy: This is the space for structured editing, feedback, and improvement.
 * Houses the existing editorial workflow: assessment, substantive editing, and sentence-level editing.
 */
const MentorWing = ({ children, className = "" }) => {
    return (
        <div className={`h-full ${className}`}>
            {/* Content Wrapper - Houses the existing editing workflow */}
            <div className="h-full">
                {children}
            </div>
        </div>
    );
};

export default MentorWing; 