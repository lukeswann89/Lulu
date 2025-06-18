import { useState, useRef, useEffect, useCallback } from 'react';

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recordingChunks, setRecordingChunks] = useState([]);
  const [totalRecordingTime, setTotalRecordingTime] = useState(0);
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const [isProcessingPunctuation, setIsProcessingPunctuation] = useState(false);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const chunkTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Configuration
  const CHUNK_DURATION = 45000; // 45 seconds
  const MAX_RECORDING_TIME = 3600000; // 1 hour

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined' || isInitializedRef.current) return;
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Voice recognition started');
      };

      recognition.onresult = (event) => {
        console.log('📥 Voice recognition got result');
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          // 🔧 FIXED: Use result[0].transcript instead of result.transcript
          const transcript = event.results[i][0].transcript;
          console.log(`📝 Processing result ${i}:`, {
            transcript: transcript,
            isFinal: event.results[i].isFinal,
            resultIndex: event.resultIndex
          });
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            console.log('✅ Added to finalTranscript:', transcript);
          }
        }

        if (finalTranscript) {
          console.log('🎉 Final transcript captured:', finalTranscript);
          const processedText = processVoiceCommands(finalTranscript);
          setRecordingChunks(prev => {
            const newChunks = [...prev];
            if (newChunks.length === 0) {
              newChunks.push(processedText);
            } else {
              const lastChunk = newChunks[newChunks.length - 1] || '';
              const separator = lastChunk && !lastChunk.endsWith(' ') ? ' ' : '';
              newChunks[newChunks.length - 1] = lastChunk + separator + processedText;
            }
            return newChunks;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('🚨 Speech recognition error:', event.error);
        
        if (event.error === 'no-speech' && isListening) {
          console.log('🔄 No speech detected, restarting...');
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              startNextChunk();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('🛑 Voice recognition chunk ended');
        if (isListening && totalRecordingTime < MAX_RECORDING_TIME) {
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              console.log('🔄 Auto-restarting next chunk...');
              startNextChunk();
            }
          }, 200);
        }
      };

      isInitializedRef.current = true;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimers();
    };
  }, [isListening, totalRecordingTime]);

  // Process voice commands for punctuation
  const processVoiceCommands = useCallback((text) => {
    if (!text) return '';
    
    let processed = text
.replace(/\s+period\s+/gi, '. ')
.replace(/\s+full stop\s+/gi, '. ')
.replace(/\s+comma\s+/gi, ', ')
.replace(/\s+question mark\s+/gi, '? ')
.replace(/\s+exclamation point\s+/gi, '! ')
.replace(/\s+exclamation mark\s+/gi, '! ')
.replace(/\s+new paragraph\s+/gi, '\n\n')
.replace(/\s+new line\s+/gi, '\n')
.replace(/\s+colon\s+/gi, ': ')
.replace(/\s+semicolon\s+/gi, '; ');

    // Capitalize first letter after periods
    processed = processed.replace(/\.\s*([a-z])/g, (match, letter) => {
      return '. ' + letter.toUpperCase();
    });

    // Capitalize first letter
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }

    return processed;
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }
  }, []);

  // Start next recording chunk
  const startNextChunk = useCallback(() => {
    if (!recognitionRef.current || totalRecordingTime >= MAX_RECORDING_TIME) {
      return;
    }

    try {
      recognitionRef.current.start();
      
      // Set timeout to stop this chunk
      chunkTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening) {
          console.log('⏰ Chunk timeout reached, stopping...');
          recognitionRef.current.stop();
        }
      }, CHUNK_DURATION);
    } catch (error) {
      console.error('🚨 Error starting speech recognition:', error);
      
      if (error.name === 'InvalidStateError') {
        setTimeout(() => {
          if (isListening) {
            startNextChunk();
          }
        }, 500);
      }
    }
  }, [isListening, totalRecordingTime]);

  // Start voice input
  const startVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      return {
        success: false,
        error: 'Speech recognition not supported in this browser. Please use Chrome or Edge.'
      };
    }

    console.log('🎬 Starting voice recording...');
    setIsListening(true);
    setRecordingChunks([]);
    setTotalRecordingTime(0);
    setShowTranscriptReview(false);
    
    // Start recording timer
    timerRef.current = setInterval(() => {
      setTotalRecordingTime(prev => {
        const newTime = prev + 1000;
        if (newTime >= MAX_RECORDING_TIME) {
          stopVoiceInput();
          return prev;
        }
        return newTime;
      });
    }, 1000);
    
    // Start first chunk
    setTimeout(() => startNextChunk(), 100);
    
    return { success: true };
  }, [startNextChunk]);

  // Stop voice input
  const stopVoiceInput = useCallback(() => {
    console.log('🛑 Stopping voice recording...');
    setIsListening(false);
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    clearTimers();
    
    // Show transcript review if we have content
    if (recordingChunks.length > 0) {
      setShowTranscriptReview(true);
    }
    
    setTotalRecordingTime(0);
  }, [recordingChunks.length, clearTimers]);

  // Reset recording state
  const resetRecording = useCallback(() => {
    setRecordingChunks([]);
    setShowTranscriptReview(false);
    setTotalRecordingTime(0);
  }, []);

  // Get combined transcript
  const getCombinedTranscript = useCallback(() => {
    return recordingChunks.join(' ').trim();
  }, [recordingChunks]);

  // Format time for display
  const formatTime = useCallback((milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // AI Punctuation Cleanup
  const cleanupPunctuationWithAI = useCallback(async (text) => {
    if (!text || text.length < 20) {
      return text;
    }

    setIsProcessingPunctuation(true);

    try {
      console.log('🤖 Requesting AI punctuation cleanup...');
      const response = await fetch('/api/punctuation-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Punctuation cleanup request failed');
      }

      const result = await response.json();
      
      if (result.success && result.cleanedText) {
        console.log('✅ AI punctuation cleanup successful');
        return result.cleanedText;
      } else {
        console.log('⚠️ AI cleanup returned original text');
        return text;
      }
    } catch (error) {
      console.error('🚨 AI cleanup failed:', error);
      return text;
    } finally {
      setIsProcessingPunctuation(false);
    }
  }, []);

  return {
    // State
    isListening,
    recognition: recognitionRef.current,
    totalRecordingTime,
    showTranscriptReview,
    isProcessingPunctuation,
    recordingChunks,
    
    // Actions
    startVoiceInput,
    stopVoiceInput,
    resetRecording,
    cleanupPunctuationWithAI,
    
    // Utilities
    getCombinedTranscript,
    formatTime,
    setShowTranscriptReview
  };
}