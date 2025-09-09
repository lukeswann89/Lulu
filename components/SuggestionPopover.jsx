// /components/SuggestionPopover.jsx
// 
// CHANGES: New component for "Red Line" grammar suggestions with "Coyote Time" UX
// - Replaces native browser tooltips with custom Headless UI popover
// - Provides Accept, Learn More, and Ignore actions
// - Follows "Three Pillars" architecture (stateless component)
// - Positioned relative to the underlined text element
// - Implements "Coyote Time" delayed close pattern for humane UX
// - Creates a "safe zone" where users can move mouse to popover without it disappearing

import React, { useEffect } from 'react';
import { Popover } from '@headlessui/react';
import { CheckIcon, LightBulbIcon, EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function SuggestionPopover({ 
  suggestion, 
  targetElement, 
  onAccept, 
  onLearnMore, 
  onIgnore, 
  onClose,
  onPopoverEnter,
  onPopoverLeave
}) {
  // FORENSIC TRACE: Component lifecycle monitoring
  useEffect(() => {
    console.log("🔍 [FORENSIC] SuggestionPopover MOUNTED for suggestion:", suggestion?.id);
    performance.mark('popover-component-mount');
    
    return () => {
      console.log("🔍 [FORENSIC] SuggestionPopover UNMOUNTING for suggestion:", suggestion?.id);
      performance.mark('popover-component-unmount');
      
      // Measure mount-to-unmount duration
      try {
        performance.measure('popover-component-lifetime', 'popover-component-mount', 'popover-component-unmount');
        const measurements = performance.getEntriesByName('popover-component-lifetime');
        if (measurements.length > 0) {
          console.log(`🔍 [FORENSIC] Popover component lifetime: ${measurements[0].duration.toFixed(2)}ms`);
        }
      } catch (e) {
        console.warn("Popover lifecycle measurement failed:", e);
      }
    };
  }, [suggestion?.id]);

  if (!suggestion || !targetElement) {
    return null;
  }

  const rect = targetElement.getBoundingClientRect();
  const popoverStyle = {
    position: 'fixed',
    top: rect.bottom + 8, // 8px below the underlined text
    left: Math.max(16, rect.left),
    zIndex: 1000,
    maxWidth: '320px',
  };

  return (
    <div 
      style={popoverStyle}
      onMouseEnter={onPopoverEnter}
      onMouseLeave={onPopoverLeave}
    >
      <Popover className="relative">
        <Popover.Panel static className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-4 w-4" />
          </button>
          <div className="mb-3 pr-6">
            <div className="text-sm font-medium text-gray-900 mb-1">Grammar Suggestion</div>
            <div className="text-sm text-gray-600">{suggestion.why || 'Consider revising this text.'}</div>
          </div>
          {suggestion.suggestion && (
            <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
              <div className="text-xs font-medium text-green-800 mb-1">Suggested Replacement:</div>
              <div className="text-sm text-green-700 font-medium">"{suggestion.suggestion}"</div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button 
              onClick={() => {
                console.log("🔍 [FORENSIC] Popover Accept button clicked for suggestion:", suggestion.id);
                performance.mark('popover-button-click');
                onAccept(suggestion.id);
              }} 
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <CheckIcon className="h-4 w-4" />
              <span>Accept</span>
            </button>
            <div className="flex items-center space-x-2">
              <button onClick={() => onLearnMore(suggestion)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md">
                <LightBulbIcon className="h-4 w-4" />
              </button>
              <button onClick={() => onIgnore(suggestion)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-md">
                <EllipsisHorizontalIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Popover.Panel>
      </Popover>
    </div>
  );
}