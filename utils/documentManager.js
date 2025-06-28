// /utils/documentManager.js
// Document management utilities for Pure Writing Mode

/**
 * Save document to localStorage with metadata
 * @param {string} content - Document content
 * @param {string} title - Document title
 * @param {Object} options - Additional options
 */
export const saveDocument = async (content, title = 'Untitled', options = {}) => {
  try {
    const documentData = {
      content,
      title,
      lastModified: new Date().toISOString(),
      wordCount: countWords(content),
      characterCount: content.length,
      ...options
    };

    // Save to localStorage
    localStorage.setItem('lulu_current_document', JSON.stringify(documentData));
    
    // Save to documents list
    const documents = getDocumentsList();
    const existingIndex = documents.findIndex(doc => doc.title === title);
    
    if (existingIndex >= 0) {
      documents[existingIndex] = documentData;
    } else {
      documents.unshift(documentData);
    }
    
    // Keep only last 10 documents
    const trimmedDocuments = documents.slice(0, 10);
    localStorage.setItem('lulu_documents_list', JSON.stringify(trimmedDocuments));
    
    return { success: true, documentData };
  } catch (error) {
    console.error('Failed to save document:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export document as text file
 * @param {string} content - Document content
 * @param {string} title - Document title
 */
export const exportDocument = (content, title = 'Untitled') => {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to export document:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load document from localStorage
 * @param {string} title - Document title (optional, loads current if not specified)
 */
export const loadDocument = (title = null) => {
  try {
    if (title) {
      const documents = getDocumentsList();
      const document = documents.find(doc => doc.title === title);
      return document || null;
    } else {
      const currentDoc = localStorage.getItem('lulu_current_document');
      return currentDoc ? JSON.parse(currentDoc) : null;
    }
  } catch (error) {
    console.error('Failed to load document:', error);
    return null;
  }
};

/**
 * Get list of saved documents
 */
export const getDocumentsList = () => {
  try {
    const documents = localStorage.getItem('lulu_documents_list');
    return documents ? JSON.parse(documents) : [];
  } catch (error) {
    console.error('Failed to get documents list:', error);
    return [];
  }
};

/**
 * Track writing session for analytics
 * @param {Object} sessionData - Session data to track
 */
export const trackWritingSession = (sessionData) => {
  try {
    const session = {
      timestamp: new Date().toISOString(),
      duration: sessionData.duration || 0,
      wordsWritten: sessionData.wordsWritten || 0,
      charactersWritten: sessionData.charactersWritten || 0,
      savesCount: sessionData.savesCount || 0,
      mode: sessionData.mode || 'write',
      ...sessionData
    };

    // Get existing sessions
    const sessions = JSON.parse(localStorage.getItem('lulu_writing_sessions') || '[]');
    sessions.push(session);
    
    // Keep only last 100 sessions
    const trimmedSessions = sessions.slice(-100);
    localStorage.setItem('lulu_writing_sessions', JSON.stringify(trimmedSessions));
    
    return { success: true, session };
  } catch (error) {
    console.error('Failed to track writing session:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get writing analytics
 */
export const getWritingAnalytics = () => {
  try {
    const sessions = JSON.parse(localStorage.getItem('lulu_writing_sessions') || '[]');
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalWords: 0,
        totalTime: 0,
        averageWordsPerSession: 0,
        averageTimePerSession: 0
      };
    }

    const totalWords = sessions.reduce((sum, session) => sum + (session.wordsWritten || 0), 0);
    const totalTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    
    return {
      totalSessions: sessions.length,
      totalWords,
      totalTime,
      averageWordsPerSession: Math.round(totalWords / sessions.length),
      averageTimePerSession: Math.round(totalTime / sessions.length),
      recentSessions: sessions.slice(-10)
    };
  } catch (error) {
    console.error('Failed to get writing analytics:', error);
    return null;
  }
};

/**
 * Count words in text
 * @param {string} text - Text to count words in
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Count characters in text
 * @param {string} text - Text to count characters in
 */
export const countCharacters = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.length;
};

/**
 * Auto-save document (called by auto-save timer)
 * @param {string} content - Document content
 * @param {string} title - Document title
 */
export const autoSaveDocument = async (content, title = 'Untitled') => {
  const result = await saveDocument(content, title, { autoSaved: true });
  return result;
};

/**
 * Clear current document
 */
export const clearCurrentDocument = () => {
  try {
    localStorage.removeItem('lulu_current_document');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear current document:', error);
    return { success: false, error: error.message };
  }
}; 