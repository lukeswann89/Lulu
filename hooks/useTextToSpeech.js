import { useState, useEffect } from 'react';

export function useTextToSpeech(chatHistory) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Handle text-to-speech for AI responses
  useEffect(() => {
    if (voiceEnabled && chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.sender === 'ai' && 'speechSynthesis' in window && !isSpeaking) {
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(lastMessage.message);
        utterance.lang = 'en-GB';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        speechSynthesis.speak(utterance);
      }
    }
  }, [chatHistory, voiceEnabled, isSpeaking]);

  const toggleVoice = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      setVoiceEnabled(!voiceEnabled);
    }
  };

  const stopSpeaking = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return {
    voiceEnabled,
    isSpeaking,
    toggleVoice,
    stopSpeaking
  };
}