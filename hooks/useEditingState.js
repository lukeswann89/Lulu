// /hooks/useEditingState.js
// BASIC EDITING STATE HOOK: Form state, UI state, suggestions, loading states

import { useState, useRef } from 'react';
import { sampleManuscript, sampleSuggestions } from '../utils/mockData';

export function useEditingState() {
  // --- FORM STATE ---
  const [editType, setEditType] = useState([]);
  const [mode, setMode] = useState('General Edits');
  const [editDepth, setEditDepth] = useState('Pro');
  const [editProfile, setEditProfile] = useState('Voice');
  const [thresholdOnly, setThresholdOnly] = useState(false);
  const [writerCue, setWriterCue] = useState('');

  // --- SUGGESTIONS STATE ---
  const [groupedSuggestions, setGroupedSuggestions] = useState({});
  const [writerEdits, setWriterEdits] = useState([]);
  const [specificEdits, setSpecificEdits] = useState(sampleSuggestions);

  // --- UI STATE ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authorship, setAuthorship] = useState({ user: 100, lulu: 0 });
  const [cueFocus, setCueFocus] = useState(false);
  const [activeRevise, setActiveRevise] = useState({ type: null, idx: null, val: '' });
  const [sessionLog, setSessionLog] = useState([]);
  const [showEditOptions, setShowEditOptions] = useState(true);
  const [logAccordion, setLogAccordion] = useState(false);

  // --- FOCUS VIEW STATE ---
  const [isFocusView, setIsFocusView] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  // --- MANUSCRIPT STATE ---
  const [text, setText] = useState(sampleManuscript);

  // --- SPECIFIC EDITS UI STATE ---
  const [showHighlights, setShowHighlights] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [activeEditIdx, setActiveEditIdx] = useState(null);
  const [activePanelIdx, setActivePanelIdx] = useState(null);
  const [focusSpecificIdx, setFocusSpecificIdx] = useState(0);
  const highlightRefs = useRef({});

  // --- PROSEMIRROR REF ---
  const proseMirrorRef = useRef(null);

  // --- COMPUTED STATE ---
  
  const allSuggestionsLength = writerEdits.length +
    Object.values(groupedSuggestions).reduce((acc, arr) => acc + arr.length, 0);
  
  const totalSuggestions = allSuggestionsLength + (mode === "Specific Edits" ? specificEdits.length : 0);
  
  const editsProcessed =
    writerEdits.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length +
    Object.values(groupedSuggestions).reduce((acc, arr) =>
      acc + arr.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length, 0
    ) +
    (mode === "Specific Edits"
      ? specificEdits.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length
      : 0);
  
  const allDone = totalSuggestions > 0 && editsProcessed === totalSuggestions;

  const allSuggestions = [
    ...writerEdits.map((sug, idx) => ({ ...sug, isWriter: true, idx, type: "Writer's Edit" })),
    ...Object.entries(groupedSuggestions).flatMap(([type, arr]) =>
      arr.map((sug, idx) => ({ ...sug, isWriter: false, idx, type }))
    )
  ];
  
  const suggestionsLength = allSuggestions.length;

  // --- RESET FUNCTIONS ---
  
  function resetSuggestions() {
    setGroupedSuggestions({});
    setWriterEdits([]);
    setSpecificEdits([]);
    setAuthorship({ user: 100, lulu: 0 });
    setSessionLog([]);
  }

  function resetUIState() {
    setActiveEditIdx(null);
    setActivePanelIdx(null);
    setFocusSpecificIdx(0);
    setFocusIndex(0);
    setActiveRevise({ type: null, idx: null, val: '' });
    setError('');
  }

  function resetFormState() {
    setEditType([]);
    setMode('General Edits');
    setEditDepth('Pro');
    setEditProfile('Voice');
    setThresholdOnly(false);
    setWriterCue('');
    setCueFocus(false);
  }

  function resetAll() {
    resetSuggestions();
    resetUIState();
    resetFormState();
    setShowEditOptions(true);
    setLogAccordion(false);
    setIsFocusView(false);
  }

  // --- VALIDATION HELPERS ---
  
  function isFormValid() {
    return text.trim().length > 0;
  }

  function canSubmit() {
    return isFormValid() && !loading;
  }

  // --- PROGRESS HELPERS ---
  
  function getProgress() {
    return {
      total: totalSuggestions,
      processed: editsProcessed,
      percentage: totalSuggestions > 0 ? Math.round((editsProcessed / totalSuggestions) * 100) : 0,
      isComplete: allDone
    };
  }

  function getAuthorshipBalance() {
    const total = authorship.user + authorship.lulu;
    return {
      user: authorship.user,
      lulu: authorship.lulu,
      userPercentage: total > 0 ? Math.round((authorship.user / total) * 100) : 100,
      luluPercentage: total > 0 ? Math.round((authorship.lulu / total) * 100) : 0
    };
  }

  // --- SESSION HELPERS ---
  
  function addSessionLogEntry(action, detail) {
    setSessionLog(log => [...log, {
      action,
      detail,
      timestamp: new Date(),
      ts: Date.now()
    }]);
  }

  function getSessionStats() {
    const actions = sessionLog.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActions: sessionLog.length,
      actions,
      sessionDuration: sessionLog.length > 0 
        ? Date.now() - sessionLog[0].ts 
        : 0
    };
  }

  // --- RETURN HOOK INTERFACE ---
  
  return {
    // --- FORM STATE ---
    editType,
    setEditType,
    mode,
    setMode,
    editDepth,
    setEditDepth,
    editProfile,
    setEditProfile,
    thresholdOnly,
    setThresholdOnly,
    writerCue,
    setWriterCue,
    cueFocus,
    setCueFocus,

    // --- SUGGESTIONS STATE ---
    groupedSuggestions,
    setGroupedSuggestions,
    writerEdits,
    setWriterEdits,
    specificEdits,
    setSpecificEdits,

    // --- UI STATE ---
    loading,
    setLoading,
    error,
    setError,
    authorship,
    setAuthorship,
    activeRevise,
    setActiveRevise,
    sessionLog,
    setSessionLog,
    showEditOptions,
    setShowEditOptions,
    logAccordion,
    setLogAccordion,

    // --- FOCUS VIEW STATE ---
    isFocusView,
    setIsFocusView,
    focusIndex,
    setFocusIndex,

    // --- MANUSCRIPT STATE ---
    text,
    setText,

    // --- SPECIFIC EDITS UI STATE ---
    showHighlights,
    setShowHighlights,
    showNumbers,
    setShowNumbers,
    activeEditIdx,
    setActiveEditIdx,
    activePanelIdx,
    setActivePanelIdx,
    focusSpecificIdx,
    setFocusSpecificIdx,
    highlightRefs,

    // --- REFS ---
    proseMirrorRef,

    // --- COMPUTED STATE ---
    allSuggestionsLength,
    totalSuggestions,
    editsProcessed,
    allDone,
    allSuggestions,
    suggestionsLength,

    // --- RESET FUNCTIONS ---
    resetSuggestions,
    resetUIState,
    resetFormState,
    resetAll,

    // --- VALIDATION HELPERS ---
    isFormValid,
    canSubmit,

    // --- PROGRESS HELPERS ---
    getProgress,
    getAuthorshipBalance,

    // --- SESSION HELPERS ---
    addSessionLogEntry,
    getSessionStats
  };
}