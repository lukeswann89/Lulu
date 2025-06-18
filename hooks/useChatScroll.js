import { useRef, useEffect } from 'react';

export function useChatScroll(chatHistory) {
  const chatContainerRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return { chatContainerRef };
}