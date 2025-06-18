import { useState } from 'react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useChatScroll } from '../../hooks/useChatScroll';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { mergeCanvasUpdates } from '../../utils/canvasUtils';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import InputForm from './InputForm';

export default function ChatInterface({ 
  chatHistory, 
  onNewMessage, 
  onPinToCanvas, 
  isLoading, 
  userProfile,
  currentCanvas,
  onCanvasUpdate
}) {
  const [inputText, setInputText] = useState('');
  
  // Custom hooks for modular functionality
  const voiceRecognition = useVoiceRecognition();
  const textToSpeech = useTextToSpeech(chatHistory);
  const { chatContainerRef } = useChatScroll(chatHistory);
  
  // Streaming chat hook
  const {
    streamingMessage,
    isStreaming,
    streamingError,
    sendStreamingMessage,
    stopStreaming,
    retryStreaming
  } = useStreamingChat();

  // Handle message submission with streaming
  const handleSubmit = async (message) => {
    // Check if we need AI punctuation cleanup
    const needsPunctuation = !message.match(/[.!?]/) && message.split(' ').length > 10;
    
    if (needsPunctuation) {
      message = await voiceRecognition.cleanupPunctuationWithAI(message);
    }
    
    // Add user message to chat history immediately
    const userMessage = {
      sender: 'user',
      message: message,
      timestamp: Date.now()
    };
    
    // Call the original onNewMessage to add user message to chat
    onNewMessage(message, false); // false = don't make API call, we'll handle streaming
    
    // Start streaming response
    sendStreamingMessage(
      message,
      userProfile,
      currentCanvas,
      [...chatHistory, userMessage], // Include the just-added user message
      handleCanvasUpdate,
      handleStreamingComplete,
      false // isPinRequest
    );
  };

  // Handle pin button clicks with streaming
  const handlePinToCanvas = async (messageContent) => {
    sendStreamingMessage(
      messageContent,
      userProfile,
      currentCanvas,
      chatHistory,
      handleCanvasUpdate,
      handleStreamingComplete,
      true // isPinRequest
    );
  };

  // Handle canvas updates from streaming
  const handleCanvasUpdate = (canvasUpdates, targetSection) => {
    if (onCanvasUpdate && canvasUpdates) {
      // Merge updates with existing canvas
      const mergedCanvas = mergeCanvasUpdates(currentCanvas, canvasUpdates);
      onCanvasUpdate(mergedCanvas, targetSection);
    }
  };

  // Handle streaming completion
  const handleStreamingComplete = (finalMessage) => {
    // Add AI response to chat history
    const aiMessage = {
      sender: 'ai',
      message: finalMessage,
      timestamp: Date.now()
    };
    
    // Add to chat history without making another API call
    onNewMessage(finalMessage, true, aiMessage); // true = isAIResponse, pass the complete message object
  };

  // Handle streaming errors
  const handleRetryLastMessage = () => {
    retryStreaming();
    // You would need to store the last message details to retry
    // For now, just clear the error
  };

  // Stop streaming if user wants to interrupt
  const handleStopStreaming = () => {
    stopStreaming();
  };

  return (
    <div 
      className="h-full flex flex-col bg-white rounded-lg shadow-lg border" 
      style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}
    >
      {/* Header */}
      <ChatHeader 
        userProfile={userProfile}
        voiceEnabled={textToSpeech.voiceEnabled}
        isSpeaking={textToSpeech.isSpeaking}
        onVoiceToggle={textToSpeech.toggleVoice}
      />

      {/* Chat Messages */}
      <ChatMessages 
        chatHistory={chatHistory}
        isLoading={isLoading}
        onPinToCanvas={handlePinToCanvas}
        chatContainerRef={chatContainerRef}
        streamingMessage={streamingMessage}
        isStreaming={isStreaming}
      />

      {/* Streaming Error Display */}
      {streamingError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-700">{streamingError}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleRetryLastMessage}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Retry
              </button>
              <button
                onClick={() => retryStreaming()}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <InputForm 
        inputText={inputText}
        setInputText={setInputText}
        onSubmit={handleSubmit}
        isLoading={isLoading || isStreaming}
        chatHistory={chatHistory}
        voiceRecognition={voiceRecognition}
        isStreaming={isStreaming}
        onStopStreaming={handleStopStreaming}
      />
    </div>
  );
}