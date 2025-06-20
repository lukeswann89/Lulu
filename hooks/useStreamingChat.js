// /hooks/useStreamingChat.js
import { useState, useRef, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export function useStreamingChat() {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState(null);
  const ctrlRef = useRef(null);

  const lastParamsRef = useRef(null);

  // Cleanup logic
  const cleanup = useCallback(() => {
    if (ctrlRef.current) {
      ctrlRef.current.abort();
      ctrlRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage('');
    setStreamingError(null);
    lastParamsRef.current = null;
  }, []);

  // Main streaming function
  const sendStreamingMessage = useCallback(
    async (
      message,
      userProfile,
      currentCanvas,
      chatHistory,
      onCanvasUpdate,
      onComplete,
      isPinRequest = false
    ) => {
      cleanup();
      setIsStreaming(true);
      setStreamingMessage('');
      setStreamingError(null);
      
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;

      let finalAccumulatedMessage = "";

      // Save params in case we want to retry
      lastParamsRef.current = {
        message,
        userProfile,
        currentCanvas,
        chatHistory,
        onCanvasUpdate,
        onComplete,
        isPinRequest,
      };

      try {
        await fetchEventSource('/api/muse-ai-stream', {
          signal: ctrl.signal,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userProfile,
            currentCanvas,
            chatHistory,
            newMessage: message,
            isPinRequest,
          }),
          async onopen(response) {
            if (!response.ok) {
              const errorText = await response.text();
              setStreamingError(`HTTP ${response.status}: ${errorText}`);
              throw new Error(`Failed to open stream: ${response.status}`);
            }
          },
          onmessage(ev) {
            if (ctrl.signal.aborted) return;
            try {
              const data = JSON.parse(ev.data);
              switch (data.type) {
                case 'start':
                  // Optionally handle start signal
                  break;
                case 'token':
                  finalAccumulatedMessage += data.content;
                  setStreamingMessage((prev) => prev + data.content);
                  break;
                case 'canvas_updates':
                  if (onCanvasUpdate && data.canvasUpdates) {
                    onCanvasUpdate(data.canvasUpdates, data.targetSection);
                  }
                  break;
                case 'complete': {
                  if (onComplete) onComplete(finalAccumulatedMessage);
                  cleanup();
                  break;
                }
                case 'error':
                  setStreamingError(data.error || 'Unknown streaming error');
                  cleanup();
                  break;
                default:
                  // Unknown event type
                  break;
              }
            } catch (err) {
              // Ignore malformed event
            }
          },
          onerror(err) {
            if (!ctrl.signal.aborted) {
              setStreamingError(err?.message || 'Streaming error');
            }
            cleanup();
            throw err;
          },
          openWhenHidden: true,
        });
      } catch (error) {
         if (!ctrl.signal.aborted) {
            setStreamingError(error?.message || 'Failed to stream response');
            cleanup();
        }
      }
    },
    [cleanup]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    // With fetch-event-source, there's no explicit close,
    // but cleanup disables UI and aborts message updates.
    cleanup();
  }, [cleanup]);

  // Retry last message
  const retryStreaming = useCallback(() => {
    setStreamingError(null);
    const params = lastParamsRef.current;
    if (params) {
      sendStreamingMessage(
        params.message,
        params.userProfile,
        params.currentCanvas,
        params.chatHistory,
        params.onCanvasUpdate,
        params.onComplete,
        params.isPinRequest
      );
    }
  }, [sendStreamingMessage]);

  return {
    streamingMessage,
    isStreaming,
    streamingError,
    sendStreamingMessage,
    stopStreaming,
    retryStreaming,
  };
}
