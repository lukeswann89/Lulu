import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatMessages({ 
  chatHistory, 
  onPinToCanvas, 
  onSelectMessageForAnalysis,
  onSetReplyingTo
}) {
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
      {chatHistory.map((msg, index) => (
        <MessageBubble
          key={msg.id || index}
          message={msg}
          onPinToCanvas={onPinToCanvas}
          onSelectMessageForAnalysis={onSelectMessageForAnalysis}
          onSetReplyingTo={onSetReplyingTo}
        />
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
}