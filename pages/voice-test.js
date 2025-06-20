import { useState } from 'react';
import Head from 'next/head';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

export default function VoiceTest() {
  const [inputText, setInputText] = useState('');
  const voiceRecognition = useVoiceRecognition();

  const {
    isListening,
    connectionStatus,
    voiceQuality,
    errorCount,
    lastError,
    isReconnecting,
    silenceTimer,
    hasSpoken,
    totalRecordingTime,
    recordingChunks,
    startVoiceInput,
    stopVoiceInput,
    resetRecording,
    cleanupPunctuationWithAI,
    getCombinedTranscript,
    formatTime,
    getConnectionStatusMessage,
    getVoiceQualityMessage
  } = voiceRecognition;

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

  const handleReset = () => {
    resetRecording();
    setInputText('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Voice Recognition Test - Lulu Muse</title>
        <meta name="description" content="Test the enhanced voice recognition features" />
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Voice Recognition Test
            </h1>
            <p className="text-gray-600">
              Testing Week 1 enhancements: Enhanced error recovery, voice quality indicators, and advanced formatting commands
            </p>
          </div>

          {/* Status Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Connection Status</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'error' ? 'bg-red-500' :
                  connectionStatus === 'reconnecting' ? 'bg-yellow-500' :
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-blue-500' :
                  'bg-gray-500'
                } animate-pulse`}></div>
                <span className="text-sm text-gray-600">
                  {getConnectionStatusMessage()}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Voice Quality</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  voiceQuality === 'excellent' ? 'bg-green-500' :
                  voiceQuality === 'good' ? 'bg-blue-500' :
                  voiceQuality === 'fair' ? 'bg-yellow-500' :
                  voiceQuality === 'poor' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {getVoiceQualityMessage()}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Recording Time</h3>
              <span className="text-lg font-mono text-gray-900">
                {formatTime(totalRecordingTime)}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Error Count</h3>
              <span className={`text-lg font-mono ${
                errorCount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {errorCount}
              </span>
            </div>
          </div>

          {/* Voice Controls */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <button
              onClick={handleVoiceToggle}
              disabled={!voiceRecognition.recognition}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isListening
                  ? connectionStatus === 'error'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isListening ? 'Stop Recording' : 'Start Recording'}
            </button>

            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>

            <button
              onClick={handleCleanupPunctuation}
              disabled={!inputText || isListening}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              AI Cleanup
            </button>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Last Error</h3>
              <p className="text-red-700">{lastError}</p>
            </div>
          )}

          {/* Reconnecting Status */}
          {isReconnecting && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-yellow-800">Reconnecting to voice recognition...</span>
              </div>
            </div>
          )}

          {/* Silence Timer */}
          {hasSpoken && silenceTimer > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-yellow-800">Silence detected</span>
                <span className="text-yellow-800 font-mono">
                  {Math.floor(silenceTimer / 1000)}s
                </span>
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transcript
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Voice input will appear here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Recording Chunks */}
          {recordingChunks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Recording Chunks</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                {recordingChunks.map((chunk, index) => (
                  <div key={index} className="mb-2 p-2 bg-white rounded border">
                    <span className="text-xs text-gray-500">Chunk {index + 1}:</span>
                    <p className="text-sm">{chunk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Commands Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Voice Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Punctuation</h4>
                <p className="text-blue-700">"period", "comma", "question mark", "exclamation point"</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Formatting</h4>
                <p className="text-blue-700">"new paragraph", "open quote", "close quote"</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Story Structure</h4>
                <p className="text-blue-700">"chapter", "scene", "act", "prologue"</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Symbols</h4>
                <p className="text-blue-700">"asterisk", "hash", "at symbol", "percent"</p>
              </div>
            </div>
          </div>

          {/* Browser Support Warning */}
          {!voiceRecognition.recognition && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Voice Recognition Not Supported</h3>
              <p className="text-red-700">
                Your browser doesn't support speech recognition. Please use Chrome or Edge for the best experience.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 