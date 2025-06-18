import MessageBubble from './MessageBubble';
import StreamingMessageBubble from './StreamingMessageBubble';

export default function ChatMessages({ 
  chatHistory, 
  isLoading, 
  onPinToCanvas, 
  chatContainerRef,
  streamingMessage,
  isStreaming 
}) {
  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      style={{ height: 'calc(100vh - 350px)', maxHeight: 'calc(100vh - 350px)' }}
    >
      {chatHistory.length === 0 && !isStreaming && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            Start the conversation! Tell me about any story idea, character, or situation that interests you.
          </p>
        </div>
      )}

      {chatHistory.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          index={index}
          onPinToCanvas={onPinToCanvas}
        />
      ))}

      {/* Streaming message bubble */}
      {isStreaming && streamingMessage && (
        <StreamingMessageBubble
          message={streamingMessage}
          isStreaming={true}
          onPinToCanvas={onPinToCanvas}
          showCursor={true}
        />
      )}

      {/* Loading indicator for non-streaming requests */}
      {isLoading && !isStreaming && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg p-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-600">Lulu is thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}