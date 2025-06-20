import { useRef, useEffect } from 'react';
import VoiceInput from './VoiceInput';

export default function InputForm({ 
  inputText, 
  setInputText, 
  onSubmit, 
  isLoading, 
  voiceRecognition,
  isStreaming,
  onStopStreaming,
}) {
  const inputRef = useRef(null);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim());
    }
  };

  // Get input field styling based on voice recognition status
  const getInputFieldStyle = () => {
    if (voiceRecognition.isListening) {
      if (voiceRecognition.connectionStatus === 'error') {
        return 'bg-red-50 border-red-300 focus:ring-red-500';
      } else if (voiceRecognition.connectionStatus === 'reconnecting') {
        return 'bg-yellow-50 border-yellow-300 focus:ring-yellow-500';
      } else {
        return 'bg-green-50 border-green-300 focus:ring-green-500';
      }
    }
    return 'bg-white border-gray-300 focus:ring-purple-500';
  };

  return (
    <div className="p-4 border-t bg-gray-50 flex-shrink-0">
      <form onSubmit={handleFormSubmit} className="flex items-start space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              voiceRecognition.isListening 
                ? "Voice recognition is active..."
                : "Share your story ideas..."
            }
            disabled={isLoading || voiceRecognition.isListening}
            rows={4}
            className={`
              w-full px-4 py-3 pr-24 border rounded-lg focus:ring-2 
              focus:border-transparent disabled:cursor-not-allowed resize-none transition-colors
              text-base
              ${getInputFieldStyle()}
            `}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e);
              }
            }}
            style={{ minHeight: '80px' }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            <VoiceInput 
              voiceRecognition={voiceRecognition}
              setInputText={setInputText}
              isLoading={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || voiceRecognition.isListening}
              className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </form>
      {isStreaming && (
          <div className="mt-2 flex items-center justify-center">
            <button
                onClick={onStopStreaming}
                className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-300"
            >
                Stop generating
            </button>
          </div>
      )}
    </div>
  );
}