// Voice Recognition Utilities for Week 1 Enhancements

/**
 * Check if the browser supports speech recognition
 */
export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

/**
 * Get the available speech recognition API
 */
export function getSpeechRecognitionAPI() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * Check microphone permissions
 */
export async function checkMicrophonePermission() {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return { granted: false, error: 'Media devices not supported' };
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };
  } catch (error) {
    return { 
      granted: false, 
      error: error.name === 'NotAllowedError' ? 'Permission denied' : error.message 
    };
  }
}

/**
 * Get browser compatibility information
 */
export function getBrowserCompatibility() {
  if (typeof window === 'undefined') {
    return { supported: false, browser: 'unknown', version: 'unknown' };
  }

  const userAgent = navigator.userAgent;
  let browser = 'unknown';
  let version = 'unknown';

  // Detect browser
  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    const match = userAgent.match(/Edge\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'unknown';
  }

  const supported = isSpeechRecognitionSupported();
  
  return {
    supported,
    browser,
    version,
    userAgent: userAgent.substring(0, 100) + '...' // Truncate for privacy
  };
}

/**
 * Get network connectivity status
 */
export function getNetworkStatus() {
  if (typeof navigator === 'undefined') {
    return { online: false, effectiveType: 'unknown' };
  }

  return {
    online: navigator.onLine,
    effectiveType: navigator.connection?.effectiveType || 'unknown',
    downlink: navigator.connection?.downlink || 'unknown',
    rtt: navigator.connection?.rtt || 'unknown'
  };
}

/**
 * Validate voice recognition configuration
 */
export function validateVoiceRecognitionConfig(config) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!config.lang) {
    errors.push('Language not specified');
  }

  if (config.maxAlternatives && (config.maxAlternatives < 1 || config.maxAlternatives > 10)) {
    warnings.push('maxAlternatives should be between 1 and 10');
  }

  // Check chunk duration
  if (config.chunkDuration && config.chunkDuration > 60000) {
    warnings.push('Chunk duration over 60 seconds may cause stability issues');
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Generate diagnostic report
 */
export async function generateDiagnosticReport() {
  const report = {
    timestamp: new Date().toISOString(),
    browser: getBrowserCompatibility(),
    network: getNetworkStatus(),
    microphone: await checkMicrophonePermission(),
    speechRecognition: {
      supported: isSpeechRecognitionSupported(),
      api: getSpeechRecognitionAPI() ? 'available' : 'not available'
    }
  };

  // Add recommendations
  report.recommendations = [];

  if (!report.browser.supported) {
    report.recommendations.push('Use Chrome or Edge for best voice recognition support');
  }

  if (!report.microphone.granted) {
    report.recommendations.push('Grant microphone permissions to use voice recognition');
  }

  if (!report.network.online) {
    report.recommendations.push('Check internet connection for voice recognition');
  }

  if (report.browser.browser === 'Firefox') {
    report.recommendations.push('Firefox has limited speech recognition support - consider using Chrome or Edge');
  }

  return report;
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error) {
  const errorMessages = {
    'no-speech': 'No speech detected. Please try speaking more clearly.',
    'audio-capture': 'Microphone access error. Please check your microphone permissions.',
    'network': 'Network error. Please check your internet connection.',
    'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
    'service-not-allowed': 'Speech recognition service not allowed.',
    'bad-grammar': 'Speech recognition grammar error.',
    'language-not-supported': 'Language not supported by speech recognition.',
    'InvalidStateError': 'Voice recognition is already active. Please stop recording first.',
    'NotSupportedError': 'Speech recognition not supported in this browser.',
    'default': 'An unexpected error occurred with voice recognition.'
  };

  return errorMessages[error] || errorMessages.default;
}

/**
 * Get voice quality assessment based on confidence scores
 */
export function assessVoiceQuality(confidenceScores) {
  if (!confidenceScores || confidenceScores.length === 0) {
    return { quality: 'unknown', average: 0, recommendations: [] };
  }

  const average = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  const min = Math.min(...confidenceScores);
  const max = Math.max(...confidenceScores);

  let quality = 'unknown';
  let recommendations = [];

  if (average >= 0.9) {
    quality = 'excellent';
  } else if (average >= 0.7) {
    quality = 'good';
  } else if (average >= 0.5) {
    quality = 'fair';
    recommendations.push('Try speaking more clearly and slowly');
  } else {
    quality = 'poor';
    recommendations.push('Check microphone quality and background noise');
    recommendations.push('Speak more clearly and at a consistent volume');
  }

  // Additional recommendations based on variance
  if (max - min > 0.3) {
    recommendations.push('Voice volume seems inconsistent - try speaking at a steady volume');
  }

  return {
    quality,
    average: Math.round(average * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    recommendations
  };
}

/**
 * Calculate optimal chunk duration based on network conditions
 */
export function calculateOptimalChunkDuration(networkStatus) {
  const baseDuration = 45000; // 45 seconds base

  if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
    return Math.min(baseDuration, 30000); // 30 seconds for slow connections
  }

  if (networkStatus.effectiveType === '3g') {
    return Math.min(baseDuration, 40000); // 40 seconds for 3g
  }

  if (networkStatus.effectiveType === '4g') {
    return baseDuration; // Full 45 seconds for good connections
  }

  return baseDuration; // Default fallback
}

/**
 * Get voice commands help text
 */
export function getVoiceCommandsHelp() {
  return {
    punctuation: [
      'period', 'full stop', 'comma', 'question mark', 'exclamation point',
      'exclamation mark', 'colon', 'semicolon', 'hyphen', 'dash'
    ],
    formatting: [
      'new paragraph', 'new line', 'open quote', 'close quote',
      'open bracket', 'close bracket', 'open square bracket', 'close square bracket'
    ],
    story: [
      'chapter', 'scene', 'act', 'interlude', 'epilogue', 'prologue'
    ],
    symbols: [
      'asterisk', 'hash', 'at symbol', 'percent', 'ampersand', 'plus',
      'equals', 'less than', 'greater than', 'pipe', 'tilde', 'caret'
    ]
  };
}

/**
 * Log voice recognition events for debugging
 */
export function logVoiceEvent(event, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    browser: getBrowserCompatibility(),
    network: getNetworkStatus()
  };

  console.log(`🎤 Voice Recognition Event: ${event}`, logEntry);
  
  // Store in localStorage for debugging (limit to last 50 events)
  try {
    const existingLogs = JSON.parse(localStorage.getItem('voiceRecognitionLogs') || '[]');
    existingLogs.push(logEntry);
    
    // Keep only last 50 events
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50);
    }
    
    localStorage.setItem('voiceRecognitionLogs', JSON.stringify(existingLogs));
  } catch (error) {
    console.warn('Failed to store voice recognition log:', error);
  }
}

/**
 * Get stored voice recognition logs
 */
export function getVoiceRecognitionLogs() {
  try {
    return JSON.parse(localStorage.getItem('voiceRecognitionLogs') || '[]');
  } catch (error) {
    console.warn('Failed to retrieve voice recognition logs:', error);
    return [];
  }
}

/**
 * Clear stored voice recognition logs
 */
export function clearVoiceRecognitionLogs() {
  try {
    localStorage.removeItem('voiceRecognitionLogs');
  } catch (error) {
    console.warn('Failed to clear voice recognition logs:', error);
  }
} 