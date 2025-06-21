import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import InputForm from './InputForm';

export default function ChatInterface({
    chatHistory,
    onNewMessage,
    onPinToCanvas,
    isLoading,
    userProfile,
    onSelectMessageForAnalysis,
    replyingTo,
    onSetReplyingTo,
    onCancelReply,
    isAdaptiveMode,
    onToggleAdaptiveMode
}) {
    // This component no longer needs the useStreamingChat hook directly
    // It has been simplified to pass props down.
    
    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
            <ChatHeader 
              title="Muse" 
              isAdaptiveMode={isAdaptiveMode} 
              onToggleAdaptiveMode={onToggleAdaptiveMode} 
            />
            <ChatMessages
                chatHistory={chatHistory}
                onPinToCanvas={onPinToCanvas}
                onSelectMessageForAnalysis={onSelectMessageForAnalysis}
                onSetReplyingTo={onSetReplyingTo}
                // stream and isStreaming are managed by the parent now
            />
            <InputForm 
                onSendMessage={onNewMessage} 
                isLoading={isLoading}
                replyingTo={replyingTo}
                onCancelReply={onCancelReply}
            />
        </div>
    );
}