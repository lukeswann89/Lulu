// /hooks/useLuluHighlights.js
// TipTap Integration Hook for Progressive Enhancement

import { useRef, useEffect, useCallback } from 'react';
import { LuluHighlightManager } from '../utils/LuluHighlightManager';

export const useLuluHighlights = (editor, options = {}) => {
  const highlightManagerRef = useRef(null);
  const isInitialized = useRef(false);

  // Initialize highlight manager when editor is ready
  useEffect(() => {
    if (editor?.view?.dom && !isInitialized.current) {
      try {
        highlightManagerRef.current = new LuluHighlightManager(
          editor.view.dom,
          {
            logEnabled: process.env.NODE_ENV === 'development',
            onReplace: options.onReplace,
            onHighlightAdded: options.onHighlightAdded,
            onClear: options.onClear,
            ...options
          }
        );
        isInitialized.current = true;
        console.log('✅ LuluHighlightManager integrated with TipTap');
      } catch (error) {
        console.error('❌ Failed to initialize LuluHighlightManager:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      if (highlightManagerRef.current) {
        highlightManagerRef.current.destroy();
        highlightManagerRef.current = null;
        isInitialized.current = false;
      }
    };
  }, [editor, options]);

  // API Methods
  const addHighlight = useCallback((searchText, replacementText, type = 'suggestion') => {
    if (!highlightManagerRef.current) {
      console.warn('Highlight manager not initialized');
      return [];
    }
    return highlightManagerRef.current.addHighlight(searchText, replacementText, type);
  }, []);

  const addSuggestions = useCallback((suggestions) => {
    if (!highlightManagerRef.current) {
      console.warn('Highlight manager not initialized');
      return [];
    }
    return highlightManagerRef.current.addSuggestions(suggestions);
  }, []);

  const clearAllHighlights = useCallback(() => {
    if (!highlightManagerRef.current) {
      console.warn('Highlight manager not initialized');
      return;
    }
    highlightManagerRef.current.clearAllHighlights();
  }, []);

  const getSuggestions = useCallback(() => {
    if (!highlightManagerRef.current) return [];
    return highlightManagerRef.current.getSuggestions();
  }, []);

  const getStats = useCallback(() => {
    if (!highlightManagerRef.current) return { total: 0, byType: {} };
    return highlightManagerRef.current.getStats();
  }, []);

  const replaceAll = useCallback((searchText, replacementText) => {
    if (!highlightManagerRef.current) {
      console.warn('Highlight manager not initialized');
      return 0;
    }
    return highlightManagerRef.current.replaceAll(searchText, replacementText);
  }, []);

  // AI Integration helpers
  const addAISuggestions = useCallback(async (text, editTypes = ['suggestion']) => {
    if (!highlightManagerRef.current) {
      console.warn('Highlight manager not initialized');
      return [];
    }

    try {
      // Call the new AI endpoint
      const response = await fetch('/api/lulu-highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          editTypes,
          options: { 
            format: 'highlights',
            maxSuggestions: 20
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'API returned error');
      }

      // Convert AI response to highlight format
      const highlights = data.suggestions.map(suggestion => ({
        original: suggestion.original,
        replacement: suggestion.replacement,
        type: suggestion.type
      }));

      console.log(`🤖 AI returned ${highlights.length} suggestions`);
      return addSuggestions(highlights);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      
      // Fallback to demo suggestions on error
      console.log('🔄 Falling back to demo suggestions...');
      return loadDemoSuggestions();
    }
  }, [addSuggestions, loadDemoSuggestions]);

  // Demo suggestions (for testing)
  const loadDemoSuggestions = useCallback(() => {
    const demoSuggestions = [
      {
        original: "very good",
        replacement: "excellent",
        type: "style"
      },
      {
        original: "a lot of",
        replacement: "many",
        type: "grammar"
      },
      {
        original: "in order to",
        replacement: "to",
        type: "structure"
      }
    ];

    return addSuggestions(demoSuggestions);
  }, [addSuggestions]);

  return {
    // Core API
    addHighlight,
    addSuggestions,
    clearAllHighlights,
    getSuggestions,
    getStats,
    replaceAll,
    
    // AI Integration
    addAISuggestions,
    
    // Demo/Testing
    loadDemoSuggestions,
    
    // Status
    isReady: !!highlightManagerRef.current,
    manager: highlightManagerRef.current
  };
};

export default useLuluHighlights;