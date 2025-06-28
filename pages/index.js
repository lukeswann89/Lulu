import { useState, useRef, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { debounce, highlightManuscript, findAllPositions, realignSuggestions } from '../utils/suggestionUtils'
import { EDIT_TYPES, EDIT_DEPTHS, PROFILES, EDIT_TYPE_TOOLTIP, getEditMeta } from '../utils/editorConfig'
import { saveDocument, autoSaveDocument, trackWritingSession, loadDocument } from '../utils/documentManager'
import Tooltip from '../components/Tooltip'
import GeneralEditsPanel from '../components/GeneralEditsPanel'
import SpecificEditsPanel from '../components/SpecificEditsPanel'
import SuggestionCard from '../components/SuggestionCard'
import WritingToolbar from '../components/WritingToolbar'

// ✅ DIRECT PROSEMIRROR IMPORTS (same as working test page)
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { luluSchema } from "../schemas/luluSchema";
import { createSuggestionPlugin, acceptSuggestion as pmAcceptSuggestion, clearAllSuggestions, getSuggestions } from "../plugins/suggestionPlugin";
import SuggestionManager from "../utils/suggestionManager";
import { docToText, createDocFromText } from "../utils/prosemirrorHelpers";

// DYNAMIC MANUSCRIPT EDITOR - Keep as fallback if needed
const LuluEditor = dynamic(() => import('../components/LuluEditor'), { ssr: false })

// --- UI Components ---

// Helper function to generate short title from suggestion text
function generateShortTitle(text) {
  if (!text) return 'Untitled Suggestion';
  const cleanText = text.replace(/^["']|["']$/g, '').trim();
  const words = cleanText.split(/\s+/);
  const shortTitle = words.slice(0, Math.min(7, words.length)).join(' ');
  return words.length > 7 ? `${shortTitle}...` : shortTitle;
}

export default function Home() {
  // --- State ---
  const [editType, setEditType] = useState([])
  const [mode, setMode] = useState('General Edits')
  const [editDepth, setEditDepth] = useState('Pro')
  const [editProfile, setEditProfile] = useState('Voice')
  const [thresholdOnly, setThresholdOnly] = useState(false)
  const [groupedSuggestions, setGroupedSuggestions] = useState({})
  const [writerCue, setWriterCue] = useState('')
  const [writerEdits, setWriterEdits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [authorship, setAuthorship] = useState({ user: 0, lulu: 0 })
  const [cueFocus, setCueFocus] = useState(false)
  const [activeRevise, setActiveRevise] = useState({ type: null, idx: null, val: '' })
  const [sessionLog, setSessionLog] = useState([])
  const [text, setText] = useState("")
  const [showEditOptions, setShowEditOptions] = useState(true)
  const [logAccordion, setLogAccordion] = useState(false)
  const [isFocusView, setIsFocusView] = useState(false)
  const [focusIndex, setFocusIndex] = useState(0)
  // Deep Dive / Ask Lulu (chat log per suggestion)
  const [expandedSuggestions, setExpandedSuggestions] = useState({})
  const [deepDiveContent, setDeepDiveContent] = useState({})
  const [deepDiveLoading, setDeepDiveLoading] = useState({})
  const [askLuluInputs, setAskLuluInputs] = useState({})
  const [askLuluLogs, setAskLuluLogs] = useState({})
  // Specific Edits State
  const [specificEdits, setSpecificEdits] = useState([])
  const [showHighlights, setShowHighlights] = useState(true)
  const [showNumbers, setShowNumbers] = useState(true)
  const [activeEditIdx, setActiveEditIdx] = useState(null)
  const [activePanelIdx, setActivePanelIdx] = useState(null)
  const [focusSpecificIdx, setFocusSpecificIdx] = useState(0)
  const highlightRefs = useRef({})

  // --- Pure Writing Mode State ---
  const [writingMode, setWritingMode] = useState('edit') // 'write' or 'edit'
  const [documentTitle, setDocumentTitle] = useState('Untitled')
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [sessionStats, setSessionStats] = useState({
    wordsWritten: 0,
    charactersWritten: 0,
    savesCount: 0
  })

  // ✅ DIRECT PROSEMIRROR REFS (same as working test page)
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  const managerRef = useRef(null);
  const [proseMirrorInitialised, setProseMirrorInitialised] = useState(false);
  const [editorLog, setEditorLog] = useState([]);

  // ✅ DIRECT PROSEMIRROR INITIALIZATION (same as working test page)
  useEffect(() => {
    if (!editorContainerRef.current || viewRef.current) return;

    console.log('🚀 Initializing ProseMirror editor directly in index.js...');

    const handleDirectHighlightAccept = (suggestionId) => {
      if (!viewRef.current) return;
      // Perform replacement & remove decoration (same as test page)
      pmAcceptSuggestion(viewRef.current, suggestionId);
      setEditorLog(l => [...l, `✔️ Direct highlight accepted: ${suggestionId}`]);
      console.log(`✔️ Direct highlight clicked and accepted: ${suggestionId}`);
    };

    // Create initial document from current text
    const doc = createDocFromText(luluSchema, text || "");

    const state = EditorState.create({
      doc,
      plugins: [createSuggestionPlugin({ onAccept: handleDirectHighlightAccept })],
    });

    const view = new EditorView(editorContainerRef.current, {
      state,
      dispatchTransaction: (tr) => {
        const newState = view.state.apply(tr);
        view.updateState(newState);
        if (tr.docChanged) {
          const newText = docToText(newState.doc);
          setText(newText);
          setEditorLog(l => [...l, `📝 Doc updated (${newText.length} chars)`]);
          console.log(`📝 Doc updated via ProseMirror (${newText.length} chars)`);
        }
      },
    });

    viewRef.current = view;
    managerRef.current = new SuggestionManager(view);

    // ✅ EXPOSE FOR DEBUGGING (same as test page)
    window.view = viewRef.current;
    window.managerRef = managerRef.current;
    window.LULU_DEBUG = {
      ...window.LULU_DEBUG,
      getSpecificEdits: () => specificEdits,
      getProseMirrorView: () => viewRef.current,
      acceptSuggestion: pmAcceptSuggestion,
      getSuggestions: () => getSuggestions(viewRef.current?.state),
      setText: setText,
      currentText: text
    };

    setProseMirrorInitialised(true);
    setEditorLog(l => [...l, '✅ ProseMirror editor initialized directly in index.js']);
    console.log('✅ ProseMirror editor initialized directly in index.js');
    console.log('🔧 Debug tools available: window.view, window.managerRef, window.LULU_DEBUG');

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
      managerRef.current = null;
      console.log('🧹 ProseMirror editor destroyed');
    };
  }, []); // Only run once

  // ✅ LOAD SUGGESTIONS DIRECTLY VIA SUGGESTIONMANAGER (same as test page approach)
  useEffect(() => {
    if (!managerRef.current || !viewRef.current || !proseMirrorInitialised) return;

    // Clear existing suggestions
    clearAllSuggestions(viewRef.current);

    // Add new suggestions using the manager (same as test page)
    if (mode === "Specific Edits" && specificEdits.length > 0 && showHighlights) {
      specificEdits.forEach(edit => {
        if (edit.original && edit.suggestion && (!edit.state || edit.state === 'pending')) {
          managerRef.current.addTextSuggestions(
            edit.original,
            edit.suggestion,
            edit.editType || 'Line'
          );
        }
      });
      setEditorLog(l => [...l, `🎨 Applied ${specificEdits.length} suggestions via SuggestionManager`]);
      console.log(`🎨 Applied ${specificEdits.length} suggestions via SuggestionManager`);
    }
  }, [specificEdits, showHighlights, mode, proseMirrorInitialised]);

  // ✅ SYNC TEXT STATE WITH PROSEMIRROR WHEN TEXT CHANGES EXTERNALLY
  useEffect(() => {
    if (!viewRef.current || !proseMirrorInitialised) return;
    
    const currentDocText = docToText(viewRef.current.state.doc);
    if (currentDocText !== text) {
      // Update ProseMirror document to match text state
      const newDoc = createDocFromText(luluSchema, text);
      const newState = EditorState.create({
        doc: newDoc,
        plugins: viewRef.current.state.plugins
      });
      viewRef.current.updateState(newState);
      console.log(`🔄 Synced ProseMirror with text state (${text.length} chars)`);
    }
  }, [text, proseMirrorInitialised]);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleTextChange = useCallback((newText) => {
    setText(newText);
  }, []);

  const handleAcceptSpecific = useCallback((id) => {
    acceptSpecific(id);
  }, [specificEdits]); // ✅ FIXED: Include specificEdits in dependency array

  const handleRejectSpecific = useCallback((id) => {
    rejectSpecific(id);
  }, []);

  const handleReviseSpecific = useCallback((id) => {
    reviseSpecific(id);
  }, []);

  // Empty callbacks for writing mode
  const emptyCallback = useCallback(() => {}, []);

  // --- Pure Writing Mode Effects ---

  // Load saved document on mount
  useEffect(() => {
    const savedDoc = loadDocument();
    if (savedDoc) {
      setText(savedDoc.content || '');
      setDocumentTitle(savedDoc.title || 'Untitled');
      setLastSaved(savedDoc.lastModified);
    }
  }, []);

  // Auto-save timer for writing mode
  useEffect(() => {
    if (writingMode === 'write' && text.trim()) {
      // Clear existing timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }

      // Set new timer for 30 seconds
      const timer = setTimeout(async () => {
        setAutoSaveStatus('saving');
        try {
          const result = await autoSaveDocument(text, documentTitle);
          if (result.success) {
            setAutoSaveStatus('saved');
            setLastSaved(result.documentData.lastModified);
            setSessionStats(prev => ({
              ...prev,
              savesCount: prev.savesCount + 1
            }));
          } else {
            setAutoSaveStatus('error');
          }
        } catch (error) {
          console.error('Auto-save error:', error);
          setAutoSaveStatus('error');
        }
      }, 30000); // 30 seconds

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [writingMode, text, documentTitle]);

  // Session tracking
  useEffect(() => {
    if (writingMode === 'write') {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }
    } else {
      // End session when switching to edit mode
      if (sessionStartTime) {
        const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        trackWritingSession({
          duration: sessionDuration,
          wordsWritten: sessionStats.wordsWritten,
          charactersWritten: sessionStats.charactersWritten,
          savesCount: sessionStats.savesCount,
          mode: 'write'
        });
        setSessionStartTime(null);
        setSessionStats({
          wordsWritten: 0,
          charactersWritten: 0,
          savesCount: 0
        });
      }
    }
  }, [writingMode, sessionStartTime, sessionStats]);

  // Update session stats when text changes in writing mode
  useEffect(() => {
    if (writingMode === 'write' && text) {
      const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;
      setSessionStats(prev => ({
        ...prev,
        wordsWritten: wordCount,
        charactersWritten: charCount
      }));
    }
  }, [text, writingMode]);

  // Panel scroll and highlight logic for Specific Edits
  useEffect(() => {
    if (mode === "Specific Edits" && activeEditIdx != null && highlightRefs.current && highlightRefs.current[activeEditIdx]) {
      highlightRefs.current[activeEditIdx].scrollIntoView({behavior:'smooth', block:'center'})
    }
  }, [activeEditIdx, mode])

  useEffect(() => {
    if (mode !== "Specific Edits" || !showHighlights) return
    const clickHandler = e => {
      const tgt = e.target.closest('.lulu-suggestion')
      if (!tgt) return
      const idx = +tgt.getAttribute('data-sug')
      setActiveEditIdx(idx)
      setActivePanelIdx(idx)
      debounce(() => {
        if (highlightRefs.current && highlightRefs.current[idx])
          highlightRefs.current[idx].scrollIntoView({behavior:'smooth', block:'center'})
      }, 100)()
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [showHighlights, mode])

  function handlePanelClick(idx) {
    setActiveEditIdx(idx)
    setActivePanelIdx(idx)
    debounce(() => {
      if (highlightRefs.current && highlightRefs.current[idx])
        highlightRefs.current[idx].scrollIntoView({behavior:'smooth', block:'center'})
    }, 100)()
  }

  // --- History logic ---
  function pushHistory(suggestions, writer) {
    setHistory(h => [...h, { grouped: suggestions, writer, specific: specificEdits }])
    setRedoStack([])
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length-1]
    setGroupedSuggestions(prev.grouped)
    setWriterEdits(prev.writer)
    setSpecificEdits(prev.specific || [])
    setHistory(h => h.slice(0,-1))
    setRedoStack(r => [{ grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }, ...r])
  }

  function redo() {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setGroupedSuggestions(next.grouped)
    setWriterEdits(next.writer)
    setSpecificEdits(next.specific || [])
    setRedoStack(r => r.slice(1))
    setHistory(h => [...h, { grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }])
  }

  // --- Pure Writing Mode Handlers ---

  const handleTitleChange = (newTitle) => {
    setDocumentTitle(newTitle);
  };

  const handleSave = (documentData) => {
    setLastSaved(documentData.lastModified);
    setSessionStats(prev => ({
      ...prev,
      savesCount: prev.savesCount + 1
    }));
  };

  const handleExport = () => {
    console.log('Document exported successfully');
  };

  const handleSwitchToEdit = () => {
    setWritingMode('edit');
    setShowEditOptions(true);
  };

  const handlePlanWithMuse = () => {
    // Encode content for URL parameter
    const encodedContent = encodeURIComponent(text);
    const encodedTitle = encodeURIComponent(documentTitle);
    const museUrl = `/muse?content=${encodedContent}&title=${encodedTitle}`;
    window.open(museUrl, '_blank');
  };

  // --- Submit ---
  async function handleSubmit() {
    setLoading(true)
    setError('')
    setGroupedSuggestions({})
    setWriterEdits([])
    setSpecificEdits([])
    setAuthorship({ user: 0, lulu: 0 })
    setSessionLog([])
    try {
      const plainText = text
      const res = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainText,
          editType,
          mode,
          writerCue,
          roadmapOnly: mode === "General Edits",
          editDepth,
          editProfile,
          thresholdOnly
        })
      })
      const data = await res.json()
      console.log("API /gpt response for Specific Edits:", data)
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      let writerEditGroup = []
      let roadmapGroups = {}
      if (mode === "General Edits") {
        (data.roadmap || []).forEach(item => {
          if (item.editType === "Writer's Edit") {
            writerEditGroup.push({
              own: item.own || item.recommendation,
              lulu: item.lulu || item.luluEdit,
              why: item.why, principles: item.principles, state: 'pending',
              deepDive: null
            })
          } else {
            if (!roadmapGroups[item.editType]) roadmapGroups[item.editType] = []
            roadmapGroups[item.editType].push({
              ...item,
              state: 'pending',
              deepDive: null
            })
          }
        })
        setWriterEdits(writerEditGroup)
        setGroupedSuggestions(roadmapGroups)
        setAuthorship({ user: 100, lulu: 0 })
        pushHistory(roadmapGroups, writerEditGroup)
        setSessionLog([])
      } else if (mode === "Specific Edits") {
        const suggestionsWithIds = (data.suggestions || []).map((s, i) => ({
            ...s,
            state: 'pending',
            id: `specific_${i}_${Date.now()}`
        }));
        setSpecificEdits(suggestionsWithIds);
        console.log("Set specificEdits to:", suggestionsWithIds)
        setAuthorship({ user: 100, lulu: 0 })
        pushHistory({}, [])
        setSessionLog([])
      }
      setShowEditOptions(false)
      setActiveEditIdx(null); setActivePanelIdx(null)
      setFocusSpecificIdx(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function logAction(action, detail, contextText = null) {
    let context = null
    if (action === 'Suggestion' || action === 'WriterEdit' || action === 'SpecificEdit') {
        const sugObj = action === 'WriterEdit' 
            ? writerEdits[detail.idx]
            : action === 'Suggestion'
                ? (groupedSuggestions[detail.editType] || [])[detail.idx]
                : specificEdits.find(e => e.id === detail.id);

        if (sugObj) {
            const mainContent = sugObj.lulu || sugObj.own || sugObj.recommendation || sugObj.suggestion || '';
            const title = sugObj.title || generateShortTitle(mainContent);
            const actionType = detail.newState.charAt(0).toUpperCase() + detail.newState.slice(1);
            const editType = detail.editType || sugObj.editType || "Writer's Edit";
            const timestamp = new Date().toLocaleTimeString();

            context = `${actionType}: '${title}' (${editType}) at ${timestamp}${detail.revision ? ` - Revised to: "${detail.revision}"` : ''}`;
        }
    } else if (action === 'Ask Lulu') {
      context = `Q: ${detail.revision} → A: ${detail.newState}`
    }
    
    setSessionLog(log => [...log, {
      action,
      newState: detail.newState,
      revision: detail.revision,
      context,
      ts: new Date()
    }])
  }

  function autoAdvance() {
    if (mode === "General Edits" && isFocusView && suggestionsLength > 1) {
      setTimeout(() => {
        setFocusIndex(i => i < suggestionsLength - 1 ? i + 1 : i)
      }, 250)
    }
    if (mode === "Specific Edits" && specificEdits.length > 1) {
      setTimeout(() => {
        setFocusSpecificIdx(i => i < specificEdits.length - 1 ? i + 1 : i)
      }, 250)
    }
  }

  function updateWriterEdit(idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits)
    setWriterEdits(eds => eds.map((e, i) => i !== idx ? e :
      { ...e, state: newState, revision: revision ?? e.revision }
    ))
    if (newState === 'accepted') setAuthorship(a => ({ ...a, user: Math.max(0, a.user-10), lulu: Math.min(100, a.lulu+10) }))
    if (newState === 'rejected') setAuthorship(a => ({ ...a, user: a.user, lulu: a.lulu }))
    setActiveRevise({ type: null, idx: null, val: '' })
    logAction('WriterEdit', { idx, newState, revision })
    autoAdvance()
  }

  function updateSuggestion(editType, idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits)
    setGroupedSuggestions(sugs => ({
      ...sugs,
      [editType]: (sugs[editType] || []).map((s,i) => i !== idx ? s :
        { ...s, state: newState, revision: revision ?? s.revision }
      )
    }))
    if (newState === 'accepted') setAuthorship(a => ({ ...a, user: a.user, lulu: Math.min(100, a.lulu+5) }))
    if (newState === 'rejected') setAuthorship(a => ({ ...a, user: Math.max(0, a.user-5), lulu: a.lulu }))
    setActiveRevise({ type: null, idx: null, val: '' })
    logAction('Suggestion', { editType, idx, newState, revision })
    autoAdvance()
  }

  function startRevise(type, idx, currentVal) {
    setActiveRevise({ type, idx, val: currentVal })
  }
  function saveRevise(type, idx, newVal, writerEdit = false) {
    if (writerEdit) updateWriterEdit(idx, 'revised', newVal)
    else updateSuggestion(type, idx, 'revised', newVal)
  }
  function cancelRevise() {
    setActiveRevise({ type: null, idx: null, val: '' })
  }

  // ✅ CORRECT ACCEPTSPECIFIC FUNCTION (implementing proven logic)
  function acceptSpecific(id) {
    console.log(`🎯 [ACTION] User clicked "Accept" for UI suggestion ID: ${id}`);

    // 1. Find the UI suggestion object from React's state
    const uiSuggestion = specificEdits.find(edit => edit.id === id);
    if (!uiSuggestion) {
      console.error("❌ Could not find the clicked suggestion in the React state.", id);
      return;
    }

    // 2. Ensure ProseMirror view is available
    if (!viewRef.current) {
      console.error("❌ ProseMirror view not available");
      return;
    }

    // 3. Get the plugin state to access internal decorations
    const pluginState = getSuggestions(viewRef.current.state);
    if (!pluginState || pluginState.length === 0) {
      console.error("❌ No suggestions found in ProseMirror plugin state");
      return;
    }

    console.log(`🔍 Looking for suggestion with original text: "${uiSuggestion.original}"`);
    console.log(`📋 Available plugin suggestions:`, pluginState.map(s => ({
      id: s.id,
      original: s.original,
      replacement: s.replacement
    })));

    // 4. Find the plugin suggestion that matches the UI suggestion's original text
    const matchingSuggestion = pluginState.find(s => s.original === uiSuggestion.original);
    
    if (!matchingSuggestion) {
      console.error("❌ Could not find matching suggestion in plugin state for:", uiSuggestion.original);
      console.log("Available plugin suggestions:", pluginState.map(s => s.original));
      return;
    }

    console.log(`✅ Found matching plugin suggestion:`, matchingSuggestion);

    // 5. Call pmAcceptSuggestion with the plugin's internal ID
    pmAcceptSuggestion(viewRef.current, matchingSuggestion.id);
    
    // 6. Update local state
    setSpecificEdits(edits =>
      edits.map(edit =>
        edit.id === id ? { ...edit, state: 'accepted' } : edit
      )
    );
    
    logAction('SpecificEdit', { id, newState: 'accepted' });
    setEditorLog(l => [...l, `✅ Successfully accepted suggestion ${id} via button click`]);
    console.log(`✅ Successfully accepted suggestion ${id} via button click`);
  }
  
  function rejectSpecific(id) {
    console.log(`🎯 Reject Specific - ID: ${id}`);
    
    // Update the state of the suggestion in the side panel (no ProseMirror action needed for reject)
    setSpecificEdits(edits =>
      edits.map(edit =>
        edit.id === id ? { ...edit, state: 'rejected' } : edit
      )
    );
    logAction('SpecificEdit', { id, newState: 'rejected' });
    console.log(`✅ Successfully rejected suggestion ${id}`);
  }

  function reviseSpecific(id) {
    console.log(`🎯 Revise Specific - ID: ${id}`);
    
    const originalSuggestion = specificEdits.find(e => e.id === id);
    if (!originalSuggestion) {
      console.error("Could not find suggestion to revise.");
      return;
    }
    
    const newSuggestionText = prompt("Revise suggestion:", originalSuggestion.suggestion);
    
    if (newSuggestionText && newSuggestionText !== originalSuggestion.suggestion) {
        setSpecificEdits(edits =>
            edits.map(edit =>
                edit.id === id ? { ...edit, suggestion: newSuggestionText, state: 'revised' } : edit
            )
        );
        logAction('SpecificEdit', { id, newState: 'revised', revision: newSuggestionText });
        console.log(`✅ Successfully revised suggestion ${id}`);
        alert("Revision saved in panel. The original highlight will remain until you re-submit for new suggestions.");
    }
  }

  // --- Deep Dive/Ask Lulu per suggestion (with chat log) ---
  async function handleToggleDeepDive(sKey, sug, groupType) {
    setExpandedSuggestions(exp => ({
      ...exp,
      [sKey]: !exp[sKey]
    }))
    if (!expandedSuggestions[sKey]) {
      if (!deepDiveContent[sKey]) {
        setDeepDiveLoading(d => ({...d, [sKey]: true}))
        const manuscript = text
        const res = await fetch('/api/deep-dive', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation || sug.suggestion),
            why: sug.why,
            principles: sug.principles || [],
            fullContext: sug.fullContext,
            manuscript
          })
        })
        const data = await res.json()
        setDeepDiveContent(content => ({...content, [sKey]: data.deepDive || "Mentor insight unavailable."}))
        setDeepDiveLoading(d => ({...d, [sKey]: false}))
      }
    }
  }

  function handleAskLuluInput(sKey, val) {
    setAskLuluInputs(inp => ({ ...inp, [sKey]: val }))
  }

  async function handleAskLuluSubmit(sKey, sug, groupType) {
    const contextText = askLuluInputs[sKey]
    if (!contextText) return
    setAskLuluInputs(inp => ({ ...inp, [sKey]: "" }))
    setAskLuluLogs(logs => ({
      ...logs,
      [sKey]: [...(logs[sKey] || []), { who: "user", text: contextText }]
    }))
    const manuscript = text
    const res = await fetch('/api/ask-lulu', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation),
        why: sug.why,
        manuscript,
        question: contextText
      })
    })
    const data = await res.json()
    const aiAnswer = data.answer || "Lulu: Mentor response unavailable."
    setAskLuluLogs(logs => ({
      ...logs,
      [sKey]: [...(logs[sKey] || []), { who: "lulu", text: aiAnswer }]
    }))
    logAction('Ask Lulu', { newState: aiAnswer, revision: contextText })
  }

  // --- All edits processed feedback ---
  const allSuggestionsLength = writerEdits.length +
    Object.values(groupedSuggestions).reduce((acc, arr) => acc + arr.length, 0)
  const totalSuggestions = allSuggestionsLength + (mode === "Specific Edits" ? specificEdits.length : 0)
  const editsProcessed =
    writerEdits.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length +
    Object.values(groupedSuggestions).reduce((acc, arr) =>
      acc + arr.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length, 0
    ) +
    (mode === "Specific Edits"
      ? specificEdits.filter(e => ['accepted','rejected','revised'].includes(e.state)).length
      : 0)
  const allDone = totalSuggestions > 0 && editsProcessed === totalSuggestions

  // --- Split-panel CSS ---
  const layoutClass = "flex flex-col md:flex-row gap-6"
  const lhsClass = "flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit"
  const rhsClass = "w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit"

  // Suggestions Navigation
  const allSuggestions = [
    ...writerEdits.map((sug, idx) => ({...sug, isWriter: true, idx, type: "Writer's Edit"})),
    ...Object.entries(groupedSuggestions).flatMap(([type, arr]) =>
      arr.map((sug, idx) => ({...sug, isWriter: false, idx, type}))
    )
  ]
  const suggestionsLength = allSuggestions.length

  function isChecked(type) {
    if (type === 'Full Edit') return editType.length === EDIT_TYPES.length - 1
    return editType.includes(type)
  }

  function toggleEditType(type) {
    if (type === 'Full Edit') {
      if (isChecked('Full Edit')) setEditType([])
      else setEditType(EDIT_TYPES.filter(t => t.type !== 'Full Edit').map(t => t.type))
      return
    }
    setEditType(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // ✅ DEMO AND DEBUG FUNCTIONS
  const loadDemoSuggestions = () => {
    if (!managerRef.current) {
      console.error("❌ SuggestionManager not available");
      return;
    }
    managerRef.current.loadDemoSuggestions();
    setEditorLog(l => [...l, "🎨 Demo suggestions loaded"]);
    console.log("🎨 Demo suggestions loaded via SuggestionManager");
  };

  const clearAllHighlights = () => {
    if (!viewRef.current) {
      console.error("❌ ProseMirror view not available");
      return;
    }
    clearAllSuggestions(viewRef.current);
    setEditorLog(l => [...l, "🧹 Cleared all highlights"]);
    console.log("🧹 Cleared all highlights");
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-center text-purple-700 flex-1">Lulu Mentor App</h1>
          
          {/* Mode Toggle */}
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setWritingMode('write')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  writingMode === 'write'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Write
              </button>
              <button
                onClick={() => setWritingMode('edit')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  writingMode === 'edit'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Edit
              </button>
            </div>
            
            <a href="/muse"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium">Story Muse</span>
            </a>
          </div>
        </div>

        {/* Writing Mode Layout */}
        {writingMode === 'write' ? (
          <div className="bg-white shadow rounded-xl overflow-hidden">
            {/* Writing Toolbar */}
            <WritingToolbar
              content={text}
              title={documentTitle}
              onTitleChange={handleTitleChange}
              onSave={handleSave}
              onExport={handleExport}
              onSwitchToEdit={handleSwitchToEdit}
              onPlanWithMuse={handlePlanWithMuse}
              autoSaveStatus={autoSaveStatus}
              lastSaved={lastSaved}
            />
            
            {/* Editor in Writing Mode */}
            <div className="p-6">
              {/* ✅ DIRECT PROSEMIRROR EDITOR CONTAINER */}
              <div
                ref={editorContainerRef}
                className="border rounded min-h-[200px] p-3 whitespace-pre-wrap font-serif focus:outline-none focus:ring-2 focus:ring-purple-400"
                style={{ minHeight: '300px', lineHeight: '1.6' }}
              />
              
              {/* Basic highlight style */}
              <style jsx global>{`
                .suggestion-highlight {
                  background: rgba(255, 235, 59, 0.45);
                  cursor: pointer;
                  transition: background 0.2s;
                  border-radius: 2px;
                }
                .suggestion-highlight:hover {
                  background: rgba(255, 235, 59, 0.7);
                }
                .ProseMirror {
                  outline: none;
                }
                .ProseMirror p {
                  margin: 0.5em 0;
                }
              `}</style>
            </div>
          </div>
        ) : (
          /* Edit Mode Layout - Original Layout with Direct ProseMirror */
          <div className="flex flex-col md:flex-row gap-6">
            {/* LHS: Manuscript Editor */}
            <div className="flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit">
              <label className="font-semibold block mb-1 text-lg">Your Manuscript</label>
              
              {/* ✅ DIRECT PROSEMIRROR EDITOR CONTAINER */}
              <div className="relative">
                <div
                  ref={editorContainerRef}
                  className="border rounded min-h-[200px] p-3 whitespace-pre-wrap font-serif focus:outline-none"
                  style={{ 
                    minHeight: '300px', 
                    lineHeight: '1.6',
                    outline: showHighlights && mode === "Specific Edits" ? '2px solid #a78bfa' : '2px solid #d1d5db'
                  }}
                />
                
                {/* Suggestion count indicator */}
                {showHighlights && mode === "Specific Edits" && specificEdits.length > 0 && (
                  <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                    {specificEdits.filter(s => s.state === 'pending' || !s.state).length} suggestions
                  </div>
                )}
              </div>
              
              {/* Basic highlight style */}
              <style jsx global>{`
                .suggestion-highlight {
                  background: rgba(255, 235, 59, 0.45);
                  cursor: pointer;
                  transition: background 0.2s;
                  border-radius: 2px;
                }
                .suggestion-highlight:hover {
                  background: rgba(255, 235, 59, 0.7);
                }
                .ProseMirror {
                  outline: none;
                }
                .ProseMirror p {
                  margin: 0.5em 0;
                }
              `}</style>

              {!showEditOptions && mode === "General Edits" && (
                <div className="mt-6 mb-4">
                  <b>Authorship meter:</b>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-purple-200 px-2 rounded">User: {authorship.user}%</span>
                    <span className="bg-blue-200 px-2 rounded">Lulu: {authorship.lulu}%</span>
                  </div>
                </div>
              )}

              {/* ✅ DEBUG LOG (only show in edit mode and if there are logs) */}
              {editorLog.length > 0 && (
                <div className="mt-4">
                  <details className="bg-gray-50 border rounded p-2">
                    <summary className="text-sm font-medium cursor-pointer">Debug Log ({editorLog.length})</summary>
                    <div className="mt-2 text-xs max-h-32 overflow-auto">
                      {editorLog.slice(-10).map((entry, idx) => (
                        <div key={idx} className="py-1">{entry}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* RHS: Options + Suggestion Panel */}
            <div className="w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit" style={{ minWidth: '24rem' }}>
              {showEditOptions ? (
                <>
                  <label className="font-semibold flex items-center mt-2 mb-1">
                    Writer's Editing Notes
                    <Tooltip text="Give Lulu your personal instructions or editing requests—she'll prioritise these as writer's edits."/>
                  </label>
                  <textarea
                    className="w-full p-2 border rounded mb-4 text-base focus:border-purple-400 focus:ring-purple-400"
                    rows={3}
                    style={{
                      color: !cueFocus && !writerCue ? '#888' : '#222'
                    }}
                    placeholder="Add any specific instructions or desired edits for Lulu to consider."
                    value={cueFocus || writerCue ? writerCue : ''}
                    onFocus={() => setCueFocus(true)}
                    onBlur={() => setCueFocus(false)}
                    onChange={e => setWriterCue(e.target.value)}
                  />

                  <div className="mb-3">
                    <label className="font-semibold block mb-1">
                      Edit Types:
                      <Tooltip text={EDIT_TYPE_TOOLTIP}/>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {EDIT_TYPES.map(et => (
                        <label key={et.type} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked(et.type)}
                            onChange={() => toggleEditType(et.type)}
                          />
                          <span className="flex items-center gap-1">{et.icon} {et.type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3">
                    <div>
                      <label className="font-semibold block mb-1">Edit Depth:</label>
                      <select className="p-2 border rounded w-full focus:border-purple-400" value={editDepth} onChange={e => setEditDepth(e.target.value)}>
                        {EDIT_DEPTHS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Editorial Profile:</label>
                      <select className="p-2 border rounded w-full focus:border-purple-400" value={editProfile} onChange={e => setEditProfile(e.target.value)}>
                        {PROFILES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 font-semibold mt-6">
                      <input type="checkbox" checked={thresholdOnly} onChange={() => setThresholdOnly(x => !x)} />
                      World-Class Threshold Only
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="font-semibold block mb-1">Editing Mode:</label>
                    <select className="p-2 border rounded w-full focus:border-purple-400" value={mode} onChange={e => setMode(e.target.value)}>
                      <option>General Edits</option>
                      <option>Specific Edits</option>
                    </select>
                  </div>

                  <div className="flex gap-3 mb-3 flex-wrap">
                    <button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold">
                      {loading ? "Thinking..." : "Submit to Lulu"}
                    </button>
                    
                    {/* ✅ DEBUG BUTTONS - Available when ProseMirror is initialized */}
                    {proseMirrorInitialised && (
                      <>
                        <button
                          onClick={loadDemoSuggestions}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          title="Load demo suggestions to test highlighting"
                        >
                          Load Demo
                        </button>
                        <button
                          onClick={clearAllHighlights}
                          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                          title="Clear all highlights"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                  {error && <div className="text-red-500 mb-4">{error}</div>}
                </>
              ) : (
                <>
                  <button
                    className="mb-6 px-4 py-2 bg-purple-600 text-white rounded font-semibold"
                    onClick={() => setShowEditOptions(true)}
                  >
                    Return to Edit Options
                  </button>

                  {/* General Edits Panel */}
                  {mode === "General Edits" && !showEditOptions && (
                    <GeneralEditsPanel
                      groupedSuggestions={groupedSuggestions}
                      writerEdits={writerEdits}
                      onApply={(selectedText) => setText(prev => `${prev}\n\n${selectedText}`)}
                      expandedSuggestions={expandedSuggestions}
                      deepDiveContent={deepDiveContent}
                      deepDiveLoading={deepDiveLoading}
                      askLuluLogs={askLuluLogs}
                      askLuluInputs={askLuluInputs}
                      onToggleDeepDive={handleToggleDeepDive}
                      onAskLuluInput={handleAskLuluInput}
                      onAskLuluSubmit={handleAskLuluSubmit}
                      onAcceptWriter={(idx, state, revision) => updateWriterEdit(idx, state, revision)}
                      onRejectWriter={(idx, state) => updateWriterEdit(idx, state)}
                      onReviseWriter={(idx, state, revision) => updateWriterEdit(idx, state, revision)}
                      onAccept={(idx, state, revision, groupType) => updateSuggestion(groupType, idx, state, revision)}
                      onReject={(idx, state, revision, groupType) => updateSuggestion(groupType, idx, state, revision)}
                      onRevise={(idx, state, revision, groupType) => updateSuggestion(groupType, idx, state, revision)}
                      onUndo={(idx, type) => {
                        if (type === "Writer's Edit") {
                          updateWriterEdit(idx, 'pending')
                        } else {
                          updateSuggestion(type, idx, 'pending')
                        }
                      }}
                      onStartRevise={startRevise}
                      onSaveRevise={saveRevise}
                      onCancelRevise={cancelRevise}
                      activeRevise={activeRevise}
                      setActiveRevise={setActiveRevise}
                      getEditMeta={getEditMeta}
                    />
                  )}

                  {/* Specific Edits Panel */}
                  {mode === "Specific Edits" && (
                    <SpecificEditsPanel
                      suggestions={specificEdits}
                      onAccept={handleAcceptSpecific}
                      onReject={handleRejectSpecific}
                      onRevise={handleReviseSpecific}
                      onStartRevise={startRevise}
                      onSaveRevise={saveRevise}
                      onCancelRevise={cancelRevise}
                      expandedSuggestions={expandedSuggestions}
                      deepDiveContent={deepDiveContent}
                      deepDiveLoading={deepDiveLoading}
                      askLuluLogs={askLuluLogs}
                      askLuluInputs={askLuluInputs}
                      onToggleDeepDive={handleToggleDeepDive}
                      onAskLuluInput={handleAskLuluInput}
                      onAskLuluSubmit={handleAskLuluSubmit}
                      activeRevise={activeRevise}
                      setActiveRevise={setActiveRevise}
                      getEditMeta={getEditMeta}
                    />
                  )}

                  {/* Learning Log */}
                  <div className="mt-8 rounded bg-purple-50 border border-purple-200">
                    <div className="flex items-center justify-between p-2 cursor-pointer" onClick={()=>setLogAccordion(a=>!a)}>
                      <h3 className="font-bold text-purple-700 mb-0">🪄 Learning Log</h3>
                      <span>{logAccordion ? '▲' : '▼'}</span>
                    </div>
                    {logAccordion && (
                      <div className="p-2">
                        {sessionLog.length === 0 ? (
                          <div className="text-sm text-gray-500">As you accept, reject, or revise, your learning progress will appear here.</div>
                        ) : (
                          <ul className="list-disc ml-5 text-sm">
                            {sessionLog.map((entry, idx) => (
                              <li key={idx}>
                                {entry.action === 'Ask Lulu'
                                  ? <><b>Ask Lulu:</b> {entry.context}</>
                                  : <><b>{entry.action}:</b> {entry.context}</>
                                }
                                <span className="ml-2 text-gray-500">{entry.ts && new Date(entry.ts).toLocaleTimeString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}