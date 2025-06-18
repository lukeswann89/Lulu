// /hooks/useEditingActions.js
// EDITING ACTIONS HOOK: Accept/reject/revise logic, history management, auto-advance

import { useState } from 'react';

// Helper function to generate short title from suggestion text
function generateShortTitle(text) {
  if (!text) return 'Untitled Suggestion';
  const cleanText = text.replace(/^["']|["']$/g, '').trim();
  const words = cleanText.split(/\s+/);
  const shortTitle = words.slice(0, Math.min(7, words.length)).join(' ');
  return words.length > 7 ? `${shortTitle}...` : shortTitle;
}

export function useEditingActions({
  // Required state updaters
  setGroupedSuggestions,
  setWriterEdits,
  setSpecificEdits,
  setAuthorship,
  setSessionLog,
  setActiveRevise,
  
  // Current state for history
  groupedSuggestions,
  writerEdits,
  specificEdits,
  
  // Workflow context
  triggerCascadeForEdit,
  
  // UI state
  mode,
  isFocusView,
  suggestionsLength,
  setFocusIndex,
  setFocusSpecificIdx,
  setActiveEditIdx,
  setActivePanelIdx,
  setText,
  proseMirrorRef
}) {
  
  // --- HISTORY STATE ---
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // --- HISTORY MANAGEMENT ---
  
  function pushHistory(suggestions, writer) {
    setHistory(h => [...h, { grouped: suggestions, writer, specific: specificEdits }]);
    setRedoStack([]);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setGroupedSuggestions(prev.grouped);
    setWriterEdits(prev.writer);
    setSpecificEdits(prev.specific || []);
    setHistory(h => h.slice(0, -1));
    setRedoStack(r => [{ grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }, ...r]);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setGroupedSuggestions(next.grouped);
    setWriterEdits(next.writer);
    setSpecificEdits(next.specific || []);
    setRedoStack(r => r.slice(1));
    setHistory(h => [...h, { grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }]);
  }

  // --- LOGGING LOGIC ---
  
  function logAction(action, detail, contextText = null) {
    let context = null;
    if (action === 'Suggestion' || action === 'WriterEdit') {
      const sugObj = action === 'WriterEdit'
        ? writerEdits[detail.idx]
        : (groupedSuggestions[detail.editType] || [])[detail.idx];
      
      if (sugObj) {
        const mainContent = sugObj.lulu || sugObj.own || sugObj.recommendation || '';
        const title = sugObj.title || generateShortTitle(mainContent);
        const actionType = detail.newState.charAt(0).toUpperCase() + detail.newState.slice(1);
        const editType = detail.editType || "Writer's Edit";
        const timestamp = new Date().toLocaleTimeString();
        
        context = `${actionType}: '${title}' (${editType}) at ${timestamp}${detail.revision ? ` - Revised to: "${detail.revision}"` : ''}`;
      }
    } else if (action === 'Ask Lulu') {
      context = `Q: ${detail.revision} → A: ${detail.newState}`;
    }
    
    setSessionLog(log => [...log, {
      action,
      newState: detail.newState,
      revision: detail.revision,
      context,
      ts: new Date()
    }]);
  }

  // --- AUTO-ADVANCE LOGIC ---
  
  function autoAdvance() {
    if (mode === "General Edits" && isFocusView && suggestionsLength > 1) {
      setTimeout(() => {
        setFocusIndex(i => i < suggestionsLength - 1 ? i + 1 : i);
      }, 250);
    }
    if (mode === "Specific Edits" && specificEdits.length > 1) {
      setTimeout(() => {
        setFocusSpecificIdx(i => i < specificEdits.length - 1 ? i + 1 : i);
      }, 250);
    }
  }

  // --- WRITER EDIT ACTIONS ---
  
  function updateWriterEdit(idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits);
    setWriterEdits(eds => eds.map((e, i) => i !== idx ? e :
      { ...e, state: newState, revision: revision ?? e.revision }
    ));
    
    if (newState === 'accepted') {
      setAuthorship(a => ({ ...a, user: Math.max(0, a.user - 10), lulu: Math.min(100, a.lulu + 10) }));
    }
    if (newState === 'rejected') {
      setAuthorship(a => ({ ...a, user: a.user, lulu: a.lulu }));
    }
    
    setActiveRevise({ type: null, idx: null, val: '' });
    logAction('WriterEdit', { idx, newState, revision });
    autoAdvance();
  }

  // --- GENERAL SUGGESTION ACTIONS ---
  
  function updateSuggestion(editType, idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits);
    
    const suggestion = (groupedSuggestions[editType] || [])[idx];
    
    setGroupedSuggestions(groups => {
      const arr = groups[editType] || [];
      return {
        ...groups,
        [editType]: arr.map((s, i) => i !== idx ? s : { ...s, state: newState, revision: revision ?? s.revision })
      };
    });
    
    if (newState === 'accepted') {
      setAuthorship(a => ({ ...a, lulu: Math.min(100, a.lulu + 5), user: Math.max(0, a.user - 5) }));
      
      // NEW: Trigger cascade if this is a cascade-enabled edit type
      if (triggerCascadeForEdit && suggestion) {
        triggerCascadeForEdit(editType, idx, {
          original: suggestion.recommendation || suggestion.own || suggestion.lulu,
          suggestion: revision || suggestion.recommendation || suggestion.own || suggestion.lulu,
          why: suggestion.why || 'Editorial improvement'
        });
      }
    }
    
    if (newState === 'rejected') {
      setAuthorship(a => ({ ...a, user: a.user, lulu: a.lulu }));
    }
    
    setActiveRevise({ type: null, idx: null, val: '' });
    logAction('Suggestion', { editType, idx, newState, revision });
    autoAdvance();
  }

  // --- SPECIFIC EDIT ACTIONS ---
  
  function acceptSpecific(idx) {
    pushHistory(groupedSuggestions, writerEdits);
    const edit = specificEdits[idx];

    console.log("🎯 Accept Specific - Cascade Integration:", {
      idx,
      edit: edit?.editType,
      hasCascadeTrigger: !!triggerCascadeForEdit
    });

    // Update the edit state
    setSpecificEdits(eds => eds.map((e, i) => 
      i !== idx ? e : { ...e, state: 'accepted' }
    ));

    // ProseMirror integration
    if (proseMirrorRef?.current && proseMirrorRef.current.editor) {
      try {
        console.log("✅ ProseMirror handling acceptance via plugin");
      } catch (error) {
        console.error("❌ ProseMirror accept error:", error);
        setText("✅ PROSEMIRROR ACCEPT FALLBACK");
      }
    } else {
      console.warn("⚠️ ProseMirror not ready, using fallback");
      setText("✅ PROSEMIRROR ACCEPT TEST");
    }

    // NEW: Trigger cascade for accepted specific edit
    if (triggerCascadeForEdit && edit) {
      triggerCascadeForEdit(edit.editType || 'Line', idx, {
        original: edit.original || '',
        suggestion: edit.suggestion || '',
        why: edit.why || 'Editorial improvement'
      });
    }

    // Update authorship
    setAuthorship(a => ({ ...a, lulu: Math.min(100, a.lulu + 3), user: Math.max(0, a.user - 3) }));
    
    setActiveEditIdx(null);
    setActivePanelIdx(null);
    autoAdvance();
  }

  function reviseSpecific(idx, revision) {
    pushHistory(groupedSuggestions, writerEdits);
    const edit = specificEdits[idx];

    console.log("📝 Revise Specific - Cascade Integration:", {
      idx,
      revision,
      edit: edit?.editType
    });

    // Update the edit state
    setSpecificEdits(eds => eds.map((e, i) => 
      i !== idx ? e : { ...e, state: 'revised', revision }
    ));

    // ProseMirror integration
    if (proseMirrorRef?.current && proseMirrorRef.current.editor) {
      try {
        console.log("✅ ProseMirror handling revision via plugin");
      } catch (error) {
        console.error("❌ ProseMirror revise error:", error);
        setText("📝 PROSEMIRROR REVISE FALLBACK");
      }
    } else {
      console.warn("⚠️ ProseMirror not ready, using fallback");
      setText("📝 PROSEMIRROR REVISE TEST");
    }

    // NEW: Trigger cascade for revised specific edit
    if (triggerCascadeForEdit && edit) {
      triggerCascadeForEdit(edit.editType || 'Line', idx, {
        original: edit.original || '',
        suggestion: revision,
        why: edit.why || 'Editorial improvement'
      });
    }

    setActiveEditIdx(null);
    setActivePanelIdx(null);
    autoAdvance();
  }

  function rejectSpecific(idx) {
    pushHistory(groupedSuggestions, writerEdits);
    setSpecificEdits(eds => eds.map((e, i) => i !== idx ? e : { ...e, state: 'rejected' }));
    setSessionLog(log => [...log, { action: 'reject', idx, ts: Date.now() }]);
    setActiveEditIdx(null);
    setActivePanelIdx(null);
    autoAdvance();
  }

  // --- REVISE STATE MANAGEMENT ---
  
  function startRevise(type, idx, currentVal) {
    setActiveRevise({ type, idx, val: currentVal });
  }

  function saveRevise(type, idx, newVal, writerEdit = false) {
    if (writerEdit) {
      updateWriterEdit(idx, 'revised', newVal);
    } else {
      updateSuggestion(type, idx, 'revised', newVal);
    }
    setActiveRevise({ type: null, idx: null, val: '' });
    autoAdvance();
  }

  function cancelRevise() {
    setActiveRevise({ type: null, idx: null, val: '' });
  }

  // --- UNDO HANDLER FOR PANELS ---
  
  function handleUndo(idx, type) {
    if (type === "Writer's Edit") {
      updateWriterEdit(idx, 'pending');
    } else {
      updateSuggestion(type, idx, 'pending');
    }
  }

  // --- RETURN HOOK INTERFACE ---
  
  return {
    // --- HISTORY ---
    history,
    redoStack,
    pushHistory,
    undo,
    redo,
    
    // --- WRITER EDIT ACTIONS ---
    updateWriterEdit,
    
    // --- GENERAL SUGGESTION ACTIONS ---
    updateSuggestion,
    
    // --- SPECIFIC EDIT ACTIONS ---
    acceptSpecific,
    reviseSpecific,
    rejectSpecific,
    
    // --- REVISE STATE ---
    startRevise,
    saveRevise,
    cancelRevise,
    
    // --- HELPER ACTIONS ---
    handleUndo,
    logAction,
    autoAdvance
  };
}