import { useState } from 'react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useChatScroll } from '../../hooks/useChatScroll';
import { useStreamingChat } from '../../hooks/useStreamingChat';
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
  onCanvasUpdate,
  onStreamComplete,
}) {
  const [inputText, setInputText] = useState('');
  
  const voiceRecognition = useVoiceRecognition();
  const textToSpeech = useTextToSpeech(chatHistory);
  const { chatContainerRef } = useChatScroll(chatHistory);
  
  const {
    streamingMessage,
    isStreaming,
    streamingError,
    sendStreamingMessage,
    stopStreaming,
    retryStreaming
  } = useStreamingChat();

  const handleSubmit = async (message) => {
    if (!message.trim() || isLoading || isStreaming) return;
    
    const text = message.trim();
    setInputText(''); 
    onNewMessage(text);
    
    const historyForApi = [
      ...chatHistory,
      { sender: 'user', message: text, timestamp: new Date().toISOString() }
    ];
    
    sendStreamingMessage(
      text,
      userProfile,
      currentCanvas,
      historyForApi, 
      onCanvasUpdate,
      onStreamComplete,
      false
    );
  };

  const handlePin = async (messageContent) => {
    sendStreamingMessage(
      messageContent,
      userProfile,
      currentCanvas,
      chatHistory,
      onCanvasUpdate,
      onStreamComplete,
      true
    );
  };

  return (
    <div 
      className="h-full flex flex-col bg-white rounded-lg shadow-lg border flex-grow lg:flex-grow-[1.5]" 
      style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}
    >
      <ChatHeader 
        userProfile={userProfile}
        voiceEnabled={textToSpeech.voiceEnabled}
        isSpeaking={textToSpeech.isSpeaking}
        onVoiceToggle={textToSpeech.toggleVoice}
      />
      <ChatMessages 
        chatHistory={chatHistory}
        isLoading={isLoading}
        onPinToCanvas={handlePin}
        chatContainerRef={chatContainerRef}
        streamingMessage={streamingMessage}
        isStreaming={isStreaming}
      />
      {streamingError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
               <span className="text-sm text-red-700">{streamingError}</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={retryStreaming}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      <InputForm 
        inputText={inputText}
        setInputText={setInputText}
        onSubmit={handleSubmit}
        isLoading={isLoading || isStreaming}
        voiceRecognition={voiceRecognition}
        isStreaming={isStreaming}
        onStopStreaming={stopStreaming}
      />
    </div>
  );
}