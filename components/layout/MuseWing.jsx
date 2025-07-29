import React from 'react';

/**
 * MuseWing - Creative ideation space for the Writer's Desk
 * 
 * CHANGES MADE:
 * - Simplified design to work with sophisticated WriterDesk headers
 * - Removed redundant header elements (now handled by parent)
 * - Focused on content area for creative tools
 * - Streamlined for integration with the "One Wing" rule system
 * 
 * Philosophy: This is the space for inspiration, brainstorming, and creative exploration.
 * Designed to house future features like character development, world-building, and ideation tools.
 */
const MuseWing = ({ className = "" }) => {
    return (
        <div className={`h-full p-6 ${className}`}>
            {/* Creative Workspace */}
            <div className="flex flex-col h-full">
                {/* Main Creative Area */}
                <div className="flex-1 flex flex-col justify-center items-center text-blue-500">
                    <div className="text-6xl mb-6">🎨</div>
                    <h3 className="text-xl font-semibold mb-3 text-blue-700">Creative Canvas</h3>
                    <p className="text-center text-sm opacity-75 max-w-md leading-relaxed">
                        Your inspiration workspace. This space will house tools for creative 
                        exploration, character development, world-building, and thematic analysis.
                    </p>
                    
                    {/* Quick Actions */}
                    <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm">
                        <button className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-blue-700 text-sm font-medium">
                            💡 Ideas
                        </button>
                        <button className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-blue-700 text-sm font-medium">
                            👥 Characters
                        </button>
                        <button className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-blue-700 text-sm font-medium">
                            🌍 World
                        </button>
                        <button className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-blue-700 text-sm font-medium">
                            🎭 Themes
                        </button>
                    </div>
                </div>

                {/* Feature Preview */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Coming Soon</h4>
                    <div className="text-xs text-blue-600 space-y-1">
                        <div>• AI-powered creative prompts</div>
                        <div>• Character development workspace</div>
                        <div>• Visual inspiration board</div>
                        <div>• Theme exploration tools</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MuseWing; 