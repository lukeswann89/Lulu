import { useState } from 'react';

export default function MessageBubble({ message, index, onPinToCanvas }) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handlePinClick = () => {
    if (onPinToCanvas) {
      onPinToCanvas(message.message);
    }
  };

  return (
    <div
      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => message.sender === 'ai' && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative max-w-[85%] ${
        message.sender === 'user' 
          ? 'bg-purple-600 text-white' 
          : 'bg-gray-100 text-gray-800'
      } rounded-lg p-3 shadow-sm`}>
        {/* Pin button for AI messages */}
        {message.sender === 'ai' && isHovered && (
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
          {message.message}
        </div>
        <div className={`text-xs mt-1 ${
          message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
        }`}>
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}