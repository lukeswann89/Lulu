import { useRef, useEffect } from 'react';
import VoiceInput from './VoiceInput';

export default function InputForm({ 
  inputText, 
  setInputText, 
  onSubmit, 
  isLoading, 
  chatHistory,
  voiceRecognition 
}) {
  const inputRef = useRef(null);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let message = inputText.trim();
    
    if (message && !isLoading) {
      // Check if we need AI punctuation cleanup
      const needsPunctuation = !message.match(/[.!?]/) && message.split(' ').length > 10;
      
      if (needsPunctuation) {
        console.log('🤖 Applying AI punctuation cleanup...');
        message = await voiceRecognition.cleanupPunctuationWithAI(message);
      }
      
      onSubmit(message);
      setInputText('');
      voiceRecognition.resetRecording();
    }
  };

  return (
    <div className="p-4 border-t bg-gray-50 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Share your story ideas... (Tip: Say 'Lulu, add this to [section]' to target specific canvas areas)"
            disabled={isLoading || voiceRecognition.isListening}
            rows={3}
            className={`
              w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 
              focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none
              ${voiceRecognition.isListening ? 'bg-red-50 border-red-200' : ''}
            `}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        
        {/* Voice Input Component */}
        <VoiceInput 
          voiceRecognition={voiceRecognition}
          inputText={inputText}
          setInputText={setInputText}
          isLoading={isLoading}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || voiceRecognition.isListening}
          className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>

      {/* Recording Status */}
      {voiceRecognition.isListening && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-red-700">
                Recording: {voiceRecognition.formatTime(voiceRecognition.totalRecordingTime)}
              </span>
            </div>
            <span className="text-xs text-red-600">
              {voiceRecognition.recordingChunks.length} chunk{voiceRecognition.recordingChunks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Helpful prompts */}
      {chatHistory.length === 1 && !voiceRecognition.isListening && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Try:</span>
          {[
            "Tell me about the main character",
            "What's the central conflict?",
            "Where does this take place?",
            "What's the big theme?",
            "Lulu, add this to protagonist"
          ].map((prompt, index) => (
            <button
              key={index}
              onClick={() => setInputText(prompt)}
              className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:border-purple-500 hover:text-purple-600 transition-colors"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
}