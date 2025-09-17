import React, { useState, useRef, useLayoutEffect } from 'react';
import Page from './Page';
import MentorWing from './MentorWing';
import MuseWing from './MuseWing';

const ManuscriptView = () => {
  // State to manage the active wing (The Mind)
  const [activeWing, setActiveWing] = useState(null);
  
  // Ref to get direct reference to manuscript container
  const manuscriptRef = useRef(null);
  
  // State to store manuscript coordinates
  const [manuscriptCoords, setManuscriptCoords] = useState({ left: 0, right: 0 });
  
  // State to prevent initial render flash
  const [hasMeasured, setHasMeasured] = useState(false);
  
  // State for desktop detection
  const [isDesktop, setIsDesktop] = useState(false);

  // Helper function to close any active wing, to be passed to children
  const handleCloseWing = () => {
    setActiveWing(null);
  };

  // Measurement and positioning logic
  useLayoutEffect(() => {
    // Function to measure manuscript position and update coordinates
    const measureAndSetCoords = () => {
      if (manuscriptRef.current) {
        const rect = manuscriptRef.current.getBoundingClientRect();
        setManuscriptCoords({
          left: rect.left,
          right: rect.right
        });
        setHasMeasured(true);
      }
    };

    // Check if desktop viewport (1024px or wider)
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Debounced resize handler (250ms delay)
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        measureAndSetCoords();
        checkDesktop();
      }, 250);
    };

    // Initial measurements
    checkDesktop();
    if (window.innerWidth >= 1024) {
      measureAndSetCoords();
    }

    // Add resize event listener
    window.addEventListener('resize', debouncedResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []); // Empty dependency array - no feedback loops

  return (
    // A container to establish the layout context for the page and wings
    <div className="bg-gray-100 min-h-screen">
      
      {/* The three-column layout for the interactive page */}
      <div className="flex justify-center p-8">
        
        {/* Column 2: Manuscript Content (The Sacred Page) */}
        <div 
          ref={manuscriptRef}
          className="relative z-20"
        >
          <Page
            activeWing={activeWing}
            onLeftWingClick={() => setActiveWing(activeWing === 'muse' ? null : 'muse')}
            onRightWingClick={() => setActiveWing(activeWing === 'mentor' ? null : 'mentor')}
            onTopWingClick={() => {/* Future: top wing functionality */}}
            onBottomWingClick={() => {/* Future: bottom wing functionality */}}
          >
            <p className="mb-6">Page 1 Content: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          </Page>
          {/* Add more <Page> components here if you wish */}
        </div>
      </div>

      {/* Render the wings only on desktop with calculated styles */}
      {isDesktop && (
        <>
          <MentorWing 
            onClose={handleCloseWing} 
            isVisible={activeWing === 'mentor'}
            style={{
              left: `${manuscriptCoords.right + 20}px`,
              // The opacity now depends on BOTH hasMeasured AND the activeWing state
              opacity: hasMeasured && activeWing === 'mentor' ? 1 : 0,
              // Add a pointer-events rule to prevent interacting with the invisible wing
              pointerEvents: activeWing === 'mentor' ? 'auto' : 'none',
            }}
          />
          <MuseWing 
            onClose={handleCloseWing} 
            isVisible={activeWing === 'muse'}
            style={{
              left: `${manuscriptCoords.left - 20}px`, // Position at left edge of manuscript, will slide left via CSS
              // The opacity now depends on BOTH hasMeasured AND the activeWing state
              opacity: hasMeasured && activeWing === 'muse' ? 1 : 0,
              // Add a pointer-events rule to prevent interacting with the invisible wing
              pointerEvents: activeWing === 'muse' ? 'auto' : 'none',
            }}
          />
        </>
      )}
    </div>
  );
};

export default ManuscriptView;