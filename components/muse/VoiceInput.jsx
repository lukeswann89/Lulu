import { useEffect } from 'react';

export default function VoiceInput({ 
  voiceRecognition, 
  inputText, 
  setInputText, 
  isLoading 
}) {
  const {
    isListening,
    startVoiceInput,
    stopVoiceInput,
    connectionStatus
  } = voiceRecognition;

  // Update input text when new chunks are recorded
  useEffect(() => {
    if (isListening && voiceRecognition.recordingChunks.length > 0) {
      const transcript = voiceRecognition.getCombinedTranscript();
      setInputText(transcript);
    }
  }, [voiceRecognition.recordingChunks, isListening, setInputText]);

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

  if (!voiceRecognition.recognition) {
    return null; // Don't render if voice recognition is not supported
  }

  return (
    <button
      type="button"
      onClick={handleVoiceToggle}
      disabled={isLoading || connectionStatus === 'error'}
      className={`p-3 rounded-lg border-2 transition-all ${
        isListening
          ? connectionStatus === 'error'
            ? 'bg-red-500 text-white border-red-500'
            : connectionStatus === 'reconnecting'
            ? 'bg-yellow-500 text-white border-yellow-500 animate-pulse'
            : 'bg-green-500 text-white border-green-500'
          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-500 hover:text-purple-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={
        isListening 
          ? 'Click to stop recording'
          : 'Click to use voice input'
      }
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
      </svg>
    </button>
  );
}