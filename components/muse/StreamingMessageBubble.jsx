import { useState, useEffect } from 'react';

export default function StreamingMessageBubble({ 
  message, 
  isStreaming = false, 
  onPinToCanvas,
  showCursor = true 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Update display text when message changes
  useEffect(() => {
    setDisplayText(message);
  }, [message]);

  // Cursor blinking effect for streaming messages
  useEffect(() => {
    if (isStreaming && showCursor) {
      const interval = setInterval(() => {
        setCursorVisible(prev => !prev);
      }, 530); // Slightly slower than typical cursor blink

      return () => clearInterval(interval);
    } else {
      setCursorVisible(false);
    }
  }, [isStreaming, showCursor]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handlePinClick = () => {
    if (onPinToCanvas && !isStreaming) {
      onPinToCanvas(displayText);
    }
  };

  return (
    <div
      className="flex justify-start"
      onMouseEnter={() => !isStreaming && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative max-w-[85%] bg-gray-100 text-gray-800 rounded-lg p-3 shadow-sm">
        {/* Pin button for completed AI messages */}
        {!isStreaming && isHovered && onPinToCanvas && (
          <button
            onClick={handlePinClick}
            className="absolute -right-10 top-2 p-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all text-purple-600 hover:text-purple-700"
            title="Pin to canvas"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </button>
        )}
        
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
          {isStreaming && showCursor && (
            <span 
              className={`inline-block w-0.5 h-4 bg-purple-600 ml-0.5 transition-opacity duration-100 ${
                cursorVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ animation: 'none' }}
            />
          )}
        </div>
        
        {!isStreaming && (
          <div className="text-xs mt-1 text-gray-500">
            {formatTimestamp(Date.now())}
          </div>
        )}
        
        {isStreaming && (
          <div className="text-xs mt-1 text-purple-600">
            <span className="animate-pulse">Lulu is writing...</span>
          </div>
        )}
      </div>
    </div>
  );
}