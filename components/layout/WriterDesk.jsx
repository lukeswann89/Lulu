import React, { useState, useCallback, useEffect } from 'react';

/**
 * WriterDesk - Sophisticated three-pane "Writer's Desk" layout implementation
 * 
 * CHANGES MADE:
 * - Implemented "One Wing" rule: only one wing can be open at a time
 * - Fixed manuscript max-width to 800px with centered positioning
 * - Added sophisticated state management with 'collapsed', 'standard', 'split', 'full' states
 * - Integrated responsive design with screen size detection
 * - Added professional toolbar with Muse (💡), Mentor (★), and Focus (👁️) controls
 * - Implemented dynamic CSS Grid layout with proper wing sizing
 * 
 * Layout States:
 * - collapsed: Wing is hidden/minimal
 * - standard: Wing at 400px width  
 * - split: Wing takes 50% of available space
 * - full: Wing takes full screen (mobile)
 */

// Custom hook for responsive design
const useWindowWidth = () => {
    const [windowWidth, setWindowWidth] = useState(1200); // Always start with default to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
        setWindowWidth(window.innerWidth);
        
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    return isClient ? windowWidth : 1200; // Use default until client-side hydration
};

const WriterDesk = ({ museWing, manuscript, mentorWing, className = "" }) => {
    const [layoutState, setLayoutState] = useState({
        muse: 'collapsed',
        mentor: 'collapsed'
    });
    
    const windowWidth = useWindowWidth();
    
    // Responsive breakpoints
    const isTablet = windowWidth < 1200;
    const isMobile = windowWidth < 768;
    
    // "One Wing" Rule: Opening one wing collapses the other
    const handleMuseToggle = useCallback(() => {
        setLayoutState(prev => {
            const newMuseState = prev.muse === 'collapsed' 
                ? (isMobile ? 'full' : isTablet ? 'split' : 'standard')
                : 'collapsed';
            
            return {
                muse: newMuseState,
                mentor: newMuseState !== 'collapsed' ? 'collapsed' : prev.mentor
            };
        });
    }, [isMobile, isTablet]);
    
    const handleMentorToggle = useCallback(() => {
        setLayoutState(prev => {
            const newMentorState = prev.mentor === 'collapsed'
                ? (isMobile ? 'full' : isTablet ? 'split' : 'standard') 
                : 'collapsed';
            
            return {
                mentor: newMentorState,
                muse: newMentorState !== 'collapsed' ? 'collapsed' : prev.muse
            };
        });
    }, [isMobile, isTablet]);
    
    const handleFocusMode = useCallback(() => {
        setLayoutState({ muse: 'collapsed', mentor: 'collapsed' });
    }, []);
    
    // Dynamic grid template calculation
    const getGridTemplate = () => {
        const museWidth = getWingWidth('muse');
        const mentorWidth = getWingWidth('mentor');
        
        // Handle full-screen states
        if (layoutState.muse === 'full') return '1fr 0 0';
        if (layoutState.mentor === 'full') return '0 0 1fr';
        
        return `${museWidth} 1fr ${mentorWidth}`;
    };
    
    const getWingWidth = (wing) => {
        const state = layoutState[wing];
        switch (state) {
            case 'standard': return '400px';
            case 'split': return 'minmax(0, 1fr)';
            case 'full': return '1fr';
            case 'collapsed':
            default: return '0';
        }
    };
    
    const getWingClass = (wing) => {
        const state = layoutState[wing];
        const baseClass = "transition-all duration-300 ease-in-out overflow-hidden";
        
        switch (state) {
            case 'collapsed': return `${baseClass} w-0 opacity-0`;
            case 'standard': return `${baseClass} opacity-100`;
            case 'split': return `${baseClass} opacity-100 min-w-0`;
            case 'full': return `${baseClass} opacity-100`;
            default: return baseClass;
        }
    };

    const isAnyWingOpen = layoutState.muse !== 'collapsed' || layoutState.mentor !== 'collapsed';

    return (
        <div className={`h-screen flex flex-col ${className}`}>
            {/* Professional Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleMuseToggle}
                        className={`p-2 rounded-lg transition-colors ${
                            layoutState.muse !== 'collapsed' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Toggle Muse Wing"
                    >
                        💡
                    </button>
                    
                    <div className="text-sm font-medium text-gray-500">
                        {layoutState.muse !== 'collapsed' ? 'Muse Active' : 'Ideation'}
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleFocusMode}
                        className={`p-2 rounded-lg transition-colors ${
                            !isAnyWingOpen 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Focus Mode"
                    >
                        👁️
                    </button>
                    
                    <div className="text-sm font-medium text-gray-500">Focus</div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-500">
                        {layoutState.mentor !== 'collapsed' ? 'Mentor Active' : 'Editorial'}
                    </div>
                    
                    <button
                        onClick={handleMentorToggle}
                        className={`p-2 rounded-lg transition-colors ${
                            layoutState.mentor !== 'collapsed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        title="Toggle Mentor Wing"
                    >
                        ★
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div 
                className="flex-1 grid transition-all duration-300 ease-in-out"
                style={{ 
                    gridTemplateColumns: getGridTemplate(),
                    gridTemplateRows: '1fr'
                }}
            >
                {/* Muse Wing - Left Panel */}
                <div className={`bg-blue-50 border-r border-gray-200 ${getWingClass('muse')}`}>
                    {layoutState.muse !== 'collapsed' && (
                        <div className="h-full flex flex-col">
                            {/* Wing Header */}
                            <div className="p-4 border-b border-blue-200 bg-blue-100">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-blue-800">✨ Creative Muse</h3>
                                        <p className="text-xs text-blue-600">Inspiration & Ideation</p>
                                    </div>
                                    
                                    {/* Wing-specific controls dropdown */}
                                    {!isMobile && (
                                        <select 
                                            value={layoutState.muse}
                                            onChange={(e) => setLayoutState(prev => ({ 
                                                ...prev, 
                                                muse: e.target.value,
                                                mentor: e.target.value !== 'collapsed' ? 'collapsed' : prev.mentor
                                            }))}
                                            className="text-xs bg-white border border-blue-300 rounded px-2 py-1"
                                        >
                                            <option value="standard">Standard View</option>
                                            <option value="split">Split View</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            
                            {/* Wing Content */}
                            <div className="flex-1 overflow-y-auto">
                                {museWing}
                            </div>
                        </div>
                    )}
                </div>

                {/* Manuscript Pane - The Sacred Page */}
                <div className="bg-gray-50 flex justify-center">
                    <div 
                        className="w-full max-w-[800px] bg-white shadow-lg my-6 mx-4 rounded-lg overflow-hidden"
                        style={{ maxWidth: '800px' }}
                    >
                        {manuscript}
                    </div>
                </div>

                {/* Mentor Wing - Right Panel */}
                <div className={`bg-green-50 border-l border-gray-200 ${getWingClass('mentor')}`}>
                    {layoutState.mentor !== 'collapsed' && (
                        <div className="h-full flex flex-col">
                            {/* Wing Header */}
                            <div className="p-4 border-b border-green-200 bg-green-100">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-green-800">🎓 Editorial Mentor</h3>
                                        <p className="text-xs text-green-600">Guidance & Refinement</p>
                                    </div>
                                    
                                    {/* Wing-specific controls dropdown */}
                                    {!isMobile && (
                                        <select 
                                            value={layoutState.mentor}
                                            onChange={(e) => setLayoutState(prev => ({ 
                                                ...prev, 
                                                mentor: e.target.value,
                                                muse: e.target.value !== 'collapsed' ? 'collapsed' : prev.muse
                                            }))}
                                            className="text-xs bg-white border border-green-300 rounded px-2 py-1"
                                        >
                                            <option value="standard">Standard View</option>
                                            <option value="split">Split View</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            
                            {/* Wing Content */}
                            <div className="flex-1 overflow-y-auto">
                                {mentorWing}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Development Helper */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 left-4 bg-black text-white px-3 py-2 rounded text-xs z-50 font-mono">
                    <div>Muse: {layoutState.muse} | Mentor: {layoutState.mentor}</div>
                    <div>Screen: {windowWidth}px ({isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'})</div>
                </div>
            )}
        </div>
    );
};

export default WriterDesk; 