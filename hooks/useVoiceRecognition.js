import { useState, useRef, useEffect, useCallback } from 'react';

export function useVoiceRecognition() {
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [recordingChunks, setRecordingChunks] = useState([]);
  const [totalRecordingTime, setTotalRecordingTime] = useState(0);
  const [showTranscriptReview, setShowTranscriptReview] = useState(false);
  const [isProcessingPunctuation, setIsProcessingPunctuation] = useState(false);
  
  // Enhanced state for Week 1 improvements
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, connected, error, reconnecting
  const [voiceQuality, setVoiceQuality] = useState('unknown'); // unknown, poor, fair, good, excellent
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [silenceTimer, setSilenceTimer] = useState(0);
  const [hasSpoken, setHasSpoken] = useState(false);
  
  // Refs
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const chunkTimeoutRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastSpeechTimeRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  // Enhanced configuration
  const CHUNK_DURATION = 45000; // 45 seconds
  const MAX_RECORDING_TIME = 3600000; // 1 hour
  const MAX_SILENCE_TIME = 10000; // 10 seconds of silence before warning
  const MAX_CONSECUTIVE_ERRORS = 3;
  const RECONNECT_DELAY = 2000; // 2 seconds between reconnection attempts

  // Initialize speech recognition with enhanced error handling
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
        setConnectionStatus('connected');
        setErrorCount(0);
        consecutiveErrorsRef.current = 0;
        setLastError(null);
        setIsReconnecting(false);
      };

      recognition.onresult = (event) => {
        console.log('📥 Voice recognition got result');
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          console.log(`📝 Processing result ${i}:`, {
            transcript: transcript,
            isFinal: event.results[i].isFinal,
            confidence: confidence,
            resultIndex: event.resultIndex
          });
          
          // Update voice quality based on confidence
          updateVoiceQuality(confidence);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            console.log('✅ Added to finalTranscript:', transcript);
            setHasSpoken(true);
            lastSpeechTimeRef.current = Date.now();
            resetSilenceTimer();
          } else {
            interimTranscript += transcript;
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
        setLastError(event.error);
        setErrorCount(prev => prev + 1);
        consecutiveErrorsRef.current += 1;
        
        // Enhanced error handling
        switch (event.error) {
          case 'no-speech':
            if (isListening) {
              console.log('🔄 No speech detected, restarting...');
              setConnectionStatus('reconnecting');
              setTimeout(() => {
                if (isListening && recognitionRef.current) {
                  startNextChunk();
                }
              }, 1000);
            }
            break;
            
          case 'audio-capture':
            setConnectionStatus('error');
            setVoiceQuality('poor');
            console.error('🎤 Audio capture error - check microphone permissions');
            break;
            
          case 'network':
            setConnectionStatus('error');
            console.error('🌐 Network error - check internet connection');
            handleReconnection();
            break;
            
          case 'not-allowed':
            setConnectionStatus('error');
            console.error('🚫 Microphone access denied');
            break;
            
          case 'service-not-allowed':
            setConnectionStatus('error');
            console.error('🔒 Speech recognition service not allowed');
            break;
            
          default:
            setConnectionStatus('error');
            console.error('❌ Unknown speech recognition error:', event.error);
            if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
              handleReconnection();
            }
            break;
        }
      };

      recognition.onend = () => {
        console.log('🛑 Voice recognition chunk ended');
        if (isListening && totalRecordingTime < MAX_RECORDING_TIME) {
          // Only auto-restart if we haven't had too many consecutive errors
          if (consecutiveErrorsRef.current < MAX_CONSECUTIVE_ERRORS) {
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                console.log('🔄 Auto-restarting next chunk...');
                startNextChunk();
              }
            }, 200);
          } else {
            console.log('⚠️ Too many consecutive errors, stopping auto-restart');
            setConnectionStatus('error');
          }
        }
      };

      isInitializedRef.current = true;
    }

    return () => {
      cleanup();
    };
  }, [isListening, totalRecordingTime]);

  // Enhanced voice quality assessment
  const updateVoiceQuality = useCallback((confidence) => {
    if (confidence >= 0.9) {
      setVoiceQuality('excellent');
    } else if (confidence >= 0.7) {
      setVoiceQuality('good');
    } else if (confidence >= 0.5) {
      setVoiceQuality('fair');
    } else {
      setVoiceQuality('poor');
    }
  }, []);

  // Silence detection and management
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    silenceTimeoutRef.current = setTimeout(() => {
      if (isListening && hasSpoken) {
        setSilenceTimer(prev => prev + 1000);
      }
    }, 1000);
  }, [isListening, hasSpoken]);

  // Enhanced reconnection logic
  const handleReconnection = useCallback(() => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    setConnectionStatus('reconnecting');
    
    console.log('🔄 Attempting to reconnect...');
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          consecutiveErrorsRef.current = 0;
        } catch (error) {
          console.error('🚨 Reconnection failed:', error);
          setConnectionStatus('error');
          setIsReconnecting(false);
        }
      }
    }, RECONNECT_DELAY);
  }, [isListening, isReconnecting]);

  // Enhanced voice command processing with advanced formatting
  const processVoiceCommands = useCallback((text) => {
    if (!text) return '';
    
    let processed = text;
    
    // Basic punctuation commands
    processed = processed
      .replace(/\s+period\s+/gi, '. ')
      .replace(/\s+full stop\s+/gi, '. ')
      .replace(/\s+comma\s+/gi, ', ')
      .replace(/\s+question mark\s+/gi, '? ')
      .replace(/\s+exclamation point\s+/gi, '! ')
      .replace(/\s+exclamation mark\s+/gi, '! ')
      .replace(/\s+new paragraph\s+/gi, '\n\n')
      .replace(/\s+new line\s+/gi, '\n')
      .replace(/\s+colon\s+/gi, ': ')
      .replace(/\s+semicolon\s+/gi, '; ')
      .replace(/\s+hyphen\s+/gi, '-')
      .replace(/\s+dash\s+/gi, '—')
      .replace(/\s+ellipsis\s+/gi, '...')
      .replace(/\s+dot dot dot\s+/gi, '...');

    // Advanced formatting commands
    processed = processed
      .replace(/\s+open quote\s+/gi, '"')
      .replace(/\s+close quote\s+/gi, '"')
      .replace(/\s+open bracket\s+/gi, '(')
      .replace(/\s+close bracket\s+/gi, ')')
      .replace(/\s+open square bracket\s+/gi, '[')
      .replace(/\s+close square bracket\s+/gi, ']')
      .replace(/\s+open curly bracket\s+/gi, '{')
      .replace(/\s+close curly bracket\s+/gi, '}')
      .replace(/\s+backslash\s+/gi, '\\')
      .replace(/\s+forward slash\s+/gi, '/')
      .replace(/\s+asterisk\s+/gi, '*')
      .replace(/\s+hash\s+/gi, '#')
      .replace(/\s+at symbol\s+/gi, '@')
      .replace(/\s+percent\s+/gi, '%')
      .replace(/\s+ampersand\s+/gi, '&')
      .replace(/\s+plus\s+/gi, '+')
      .replace(/\s+equals\s+/gi, '=')
      .replace(/\s+less than\s+/gi, '<')
      .replace(/\s+greater than\s+/gi, '>')
      .replace(/\s+pipe\s+/gi, '|')
      .replace(/\s+tilde\s+/gi, '~')
      .replace(/\s+caret\s+/gi, '^');

    // Story-specific commands
    processed = processed
      .replace(/\s+chapter\s+/gi, '\n\nChapter ')
      .replace(/\s+scene\s+/gi, '\n\nScene ')
      .replace(/\s+act\s+/gi, '\n\nAct ')
      .replace(/\s+interlude\s+/gi, '\n\nInterlude ')
      .replace(/\s+epilogue\s+/gi, '\n\nEpilogue ')
      .replace(/\s+prologue\s+/gi, '\n\nPrologue ');

    // Capitalization improvements
    processed = processed.replace(/\.\s*([a-z])/g, (match, letter) => {
      return '. ' + letter.toUpperCase();
    });

    // Capitalize first letter
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }

    // Clean up multiple spaces and line breaks
    processed = processed
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return processed;
  }, []);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    clearTimers();
    setConnectionStatus('idle');
    setVoiceQuality('unknown');
    setErrorCount(0);
    setLastError(null);
    setIsReconnecting(false);
    setSilenceTimer(0);
    setHasSpoken(false);
    consecutiveErrorsRef.current = 0;
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
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Enhanced chunk management
  const startNextChunk = useCallback(() => {
    if (!recognitionRef.current || totalRecordingTime >= MAX_RECORDING_TIME) {
      return;
    }

    try {
      setConnectionStatus('connecting');
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
      setConnectionStatus('error');
      
      if (error.name === 'InvalidStateError') {
        setTimeout(() => {
          if (isListening) {
            startNextChunk();
          }
        }, 500);
      }
    }
  }, [isListening, totalRecordingTime]);

  // Enhanced voice input start
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
    setConnectionStatus('connecting');
    setVoiceQuality('unknown');
    setErrorCount(0);
    setLastError(null);
    setIsReconnecting(false);
    setSilenceTimer(0);
    setHasSpoken(false);
    consecutiveErrorsRef.current = 0;
    
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

  // Enhanced voice input stop
  const stopVoiceInput = useCallback(() => {
    console.log('🛑 Stopping voice recording...');
    setIsListening(false);
    setConnectionStatus('idle');
    
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
    setConnectionStatus('idle');
    setVoiceQuality('unknown');
    setErrorCount(0);
    setLastError(null);
    setIsReconnecting(false);
    setSilenceTimer(0);
    setHasSpoken(false);
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

  // Get connection status message
  const getConnectionStatusMessage = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to voice recognition...';
      case 'connected':
        return 'Voice recognition active';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'error':
        return lastError ? `Error: ${lastError}` : 'Connection error';
      default:
        return 'Ready to record';
    }
  }, [connectionStatus, lastError]);

  // Get voice quality message
  const getVoiceQualityMessage = useCallback(() => {
    switch (voiceQuality) {
      case 'excellent':
        return 'Excellent voice quality';
      case 'good':
        return 'Good voice quality';
      case 'fair':
        return 'Fair voice quality - try speaking more clearly';
      case 'poor':
        return 'Poor voice quality - check microphone and environment';
      default:
        return 'Voice quality unknown';
    }
  }, [voiceQuality]);

  return {
    // Core state
    isListening,
    recognition: recognitionRef.current,
    totalRecordingTime,
    showTranscriptReview,
    isProcessingPunctuation,
    recordingChunks,
    
    // Enhanced state (Week 1 improvements)
    connectionStatus,
    voiceQuality,
    errorCount,
    lastError,
    isReconnecting,
    silenceTimer,
    hasSpoken,
    
    // Actions
    startVoiceInput,
    stopVoiceInput,
    resetRecording,
    cleanupPunctuationWithAI,
    
    // Utilities
    getCombinedTranscript,
    formatTime,
    setShowTranscriptReview,
    getConnectionStatusMessage,
    getVoiceQualityMessage,
    
    // Enhanced utilities
    cleanup
  };
}