// /hooks/useDeepDive.js
// DEEP DIVE HOOK: Ask Lulu functionality, deep dive content, chat logs

import { useState } from 'react';
import { apiClient } from '../utils/apiClient';

export function useDeepDive({ text, logAction }) {
  // --- DEEP DIVE STATE ---
  const [expandedSuggestions, setExpandedSuggestions] = useState({});
  const [deepDiveContent, setDeepDiveContent] = useState({});
  const [deepDiveLoading, setDeepDiveLoading] = useState({});
  const [askLuluInputs, setAskLuluInputs] = useState({});
  const [askLuluLogs, setAskLuluLogs] = useState({});

  // --- DEEP DIVE HANDLERS ---
  
  async function handleToggleDeepDive(sKey, sug, groupType) {
    setExpandedSuggestions(exp => ({
      ...exp,
      [sKey]: !exp[sKey]
    }));
    
    if (!expandedSuggestions[sKey]) {
      if (!deepDiveContent[sKey]) {
        setDeepDiveLoading(d => ({ ...d, [sKey]: true }));
        
        try {
          const manuscript = text;
          const { data, meta } = await apiClient.post('/api/deep-dive', {
            suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation || sug.suggestion),
            why: sug.why,
            principles: sug.principles || [],
            fullContext: sug.fullContext,
            manuscript
          });
          
          // Optional: observability
          console.debug('[DeepDive] meta', meta);
          
          setDeepDiveContent(content => ({
            ...content, 
            [sKey]: data?.deepDive || "Mentor insight unavailable."
          }));
          
        } catch (error) {
          console.error('Deep dive error:', error);
          setDeepDiveContent(content => ({
            ...content, 
            [sKey]: "Error loading mentor insight. Please try again."
          }));
        } finally {
          setDeepDiveLoading(d => ({ ...d, [sKey]: false }));
        }
      }
    }
  }

  // --- ASK LULU HANDLERS ---
  
  function handleAskLuluInput(sKey, val) {
    setAskLuluInputs(inp => ({ ...inp, [sKey]: val }));
  }

  async function handleAskLuluSubmit(sKey, sug, groupType) {
    const contextText = askLuluInputs[sKey];
    if (!contextText) return;
    
    setAskLuluInputs(inp => ({ ...inp, [sKey]: "" }));
    setAskLuluLogs(logs => ({
      ...logs,
      [sKey]: [...(logs[sKey] || []), { who: "user", text: contextText }]
    }));
    
    try {
      const manuscript = text;
      const { data, meta } = await apiClient.post('/api/ask-lulu', {
        suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation),
        why: sug.why,
        manuscript,
        question: contextText
      });
      
      // Optional: observability
      console.debug('[AskLulu] meta', meta);
      
      const aiAnswer = data?.answer || "Lulu: Mentor response unavailable.";
      
      setAskLuluLogs(logs => ({
        ...logs,
        [sKey]: [...(logs[sKey] || []), { who: "lulu", text: aiAnswer }]
      }));
      
      if (logAction) {
        logAction('Ask Lulu', { newState: aiAnswer, revision: contextText });
      }
      
    } catch (error) {
      console.error('Ask Lulu error:', error);
      const errorAnswer = "Lulu: Sorry, I couldn't process your question. Please try again.";
      
      setAskLuluLogs(logs => ({
        ...logs,
        [sKey]: [...(logs[sKey] || []), { who: "lulu", text: errorAnswer }]
      }));
    }
  }

  // --- RESET FUNCTIONS ---
  
  function resetDeepDive() {
    setExpandedSuggestions({});
    setDeepDiveContent({});
    setDeepDiveLoading({});
    setAskLuluInputs({});
    setAskLuluLogs({});
  }

  function clearDeepDiveForKey(sKey) {
    setExpandedSuggestions(exp => {
      const newExp = { ...exp };
      delete newExp[sKey];
      return newExp;
    });
    setDeepDiveContent(content => {
      const newContent = { ...content };
      delete newContent[sKey];
      return newContent;
    });
    setDeepDiveLoading(loading => {
      const newLoading = { ...loading };
      delete newLoading[sKey];
      return newLoading;
    });
    setAskLuluInputs(inputs => {
      const newInputs = { ...inputs };
      delete newInputs[sKey];
      return newInputs;
    });
    setAskLuluLogs(logs => {
      const newLogs = { ...logs };
      delete newLogs[sKey];
      return newLogs;
    });
  }

  // --- HELPER FUNCTIONS ---
  
  function getSuggestionDeepDiveStatus(sKey) {
    return {
      isExpanded: !!expandedSuggestions[sKey],
      hasContent: !!deepDiveContent[sKey],
      isLoading: !!deepDiveLoading[sKey],
      hasAskLuluHistory: !!(askLuluLogs[sKey] && askLuluLogs[sKey].length > 0),
      currentInput: askLuluInputs[sKey] || ''
    };
  }

  function getAllExpandedSuggestions() {
    return Object.keys(expandedSuggestions).filter(key => expandedSuggestions[key]);
  }

  function getTotalAskLuluInteractions() {
    return Object.values(askLuluLogs).reduce((total, logs) => total + (logs?.length || 0), 0);
  }

  // --- BULK OPERATIONS ---
  
  function collapseAllSuggestions() {
    setExpandedSuggestions({});
  }

  function clearAllAskLuluInputs() {
    setAskLuluInputs({});
  }

  // --- RETURN HOOK INTERFACE ---
  
  return {
    // --- STATE ---
    expandedSuggestions,
    deepDiveContent,
    deepDiveLoading,
    askLuluInputs,
    askLuluLogs,
    
    // --- HANDLERS ---
    handleToggleDeepDive,
    handleAskLuluInput,
    handleAskLuluSubmit,
    
    // --- RESET FUNCTIONS ---
    resetDeepDive,
    clearDeepDiveForKey,
    
    // --- HELPER FUNCTIONS ---
    getSuggestionDeepDiveStatus,
    getAllExpandedSuggestions,
    getTotalAskLuluInteractions,
    
    // --- BULK OPERATIONS ---
    collapseAllSuggestions,
    clearAllAskLuluInputs,
    
    // --- DIRECT SETTERS (for external control if needed) ---
    setExpandedSuggestions,
    setDeepDiveContent,
    setDeepDiveLoading,
    setAskLuluInputs,
    setAskLuluLogs
  };
}