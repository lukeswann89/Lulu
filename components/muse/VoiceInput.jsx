import { useEffect } from 'react';

export default function VoiceInput({ 
  voiceRecognition, 
  inputText, 
  setInputText, 
  isLoading 
}) {
  const {
    isListening,
    recognition,
    totalRecordingTime,
    showTranscriptReview,
    isProcessingPunctuation,
    startVoiceInput,
    stopVoiceInput,
    formatTime,
    cleanupPunctuationWithAI,
    getCombinedTranscript,
    setShowTranscriptReview,
    recordingChunks
  } = voiceRecognition;

  // Update input text when new chunks are recorded
  useEffect(() => {
    if (isListening && recordingChunks.length > 0) {
      const transcript = getCombinedTranscript();
      setInputText(transcript);
    }
  }, [recordingChunks, isListening, getCombinedTranscript, setInputText]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      const result = startVoiceInput();
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleCleanupPunctuation = async () => {
    const cleaned = await cleanupPunctuationWithAI(inputText);
    setInputText(cleaned);
  };

  if (!recognition) {
    return null; // Don't render if voice recognition is not supported
  }

  return (
    <>
      {/* Transcript Review Panel */}
      {showTranscriptReview && inputText && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Review your transcript:</span>
            <button
              onClick={handleCleanupPunctuation}
              disabled={isProcessingPunctuation}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessingPunctuation ? 'Processing...' : 'Add Punctuation'}
            </button>
          </div>
          <div className="text-xs text-gray-600 mb-2">
            Tip: Say "period", "comma", or "question mark" to add punctuation while speaking
          </div>
        </div>
      )}

      {/* Voice Input Button with Recording Timer */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={isLoading}
          className={`p-3 rounded-lg border-2 transition-all ${
            isListening
              ? 'bg-red-500 text-white border-red-500 animate-pulse'
              : 'bg-white text-gray-600 border-gray-300 hover:border-purple-500 hover:text-purple-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isListening ? 'Click to stop recording' : 'Click to use voice input'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </button>
        {isListening && (
          <span className="text-xs text-red-600 mt-1">
            {formatTime(totalRecordingTime)}
          </span>
        )}
      </div>

      {/* Recording Status */}
      {isListening && (
        <div className="mt-2 text-center w-full">
          <span className="text-sm text-red-600 animate-pulse">
            🎤 Recording... Say "period", "comma", or "question mark" for punctuation
          </span>
        </div>
      )}
    </>
  );
}