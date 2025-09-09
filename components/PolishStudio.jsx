import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpecificEditCard from './SpecificEditCard';
import EditorialReport from './EditorialReport';

/**
 * PolishStudio - MVP container for chronologically ordered Focus Edit workflow
 * - Reuses canonical SpecificEditCard for rendering
 * - Provides Focus/Overview toggle and keyboard navigation (N/P/A/R)
 * - Communicates activeSuggestionId upward via onActiveSuggestionChange
 */
export default function PolishStudio({
  suggestions = [],
  onAccept = () => {},
  onReject,
  onRevise = () => {},
  onActiveSuggestionChange = () => {},
  getEditMeta,
  className = '',
  initialText = '',
  finalText = '',
  onApplyWithLulu = () => {}
}) {
  // View state
  // MVP: Focus-only view
  const [phase, setPhase] = useState('review'); // 'review' | 'report'
  const [activeSuggestionId, setActiveSuggestionId] = useState(null);
  const [decisions, setDecisions] = useState([]); // {suggestion, action: 'accept'|'reject'}
  const sessionStartedRef = useRef(false);

  // Flatten conflict groups (if any) and sort by position (from)
  const flatSorted = useMemo(() => {
    const flatten = (arr) => {
      const res = [];
      for (const s of arr || []) {
        if (s && s.isConflictGroup && Array.isArray(s.suggestions)) {
          for (const child of s.suggestions) res.push(child);
        } else if (s) {
          res.push(s);
        }
      }
      return res;
    };
    const flat = flatten(suggestions);
    return flat
      .slice()
      .sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
  }, [suggestions]);

  // Derived indices and helpers
  const activeIndex = useMemo(() => flatSorted.findIndex(s => s.id === activeSuggestionId), [flatSorted, activeSuggestionId]);
  const hasSuggestions = flatSorted.length > 0;

  // Phase transitions
  useEffect(() => {
    if (!hasSuggestions) {
      if (sessionStartedRef.current) {
        setPhase('report');
      }
    } else {
      // When suggestions are present, ensure we're in review mode
      setPhase('review');
    }
  }, [hasSuggestions]);

  // Sync upward for Unified Suggestion State ghosting
  useEffect(() => {
    onActiveSuggestionChange(activeSuggestionId);
  }, [activeSuggestionId, onActiveSuggestionChange]);

  // Start review handler
  const handleStart = useCallback(() => {
    // Start reviewing immediately (brief removed)
    if (flatSorted.length > 0) setActiveSuggestionId(flatSorted[0].id);
    setDecisions([]);
    sessionStartedRef.current = true;
  }, [flatSorted]);

  // Advance helpers
  const focusByIndex = useCallback((idx) => {
    if (idx < 0 || idx >= flatSorted.length) return;
    setActiveSuggestionId(flatSorted[idx].id);
  }, [flatSorted]);

  const focusNext = useCallback(() => {
    if (activeIndex === -1) {
      if (flatSorted.length > 0) setActiveSuggestionId(flatSorted[0].id);
      return;
    }
    const next = activeIndex + 1;
    if (next < flatSorted.length) focusByIndex(next);
  }, [activeIndex, flatSorted, focusByIndex]);

  const focusPrev = useCallback(() => {
    if (activeIndex === -1) {
      if (flatSorted.length > 0) setActiveSuggestionId(flatSorted[0].id);
      return;
    }
    const prev = activeIndex - 1;
    if (prev >= 0) focusByIndex(prev);
  }, [activeIndex, flatSorted, focusByIndex]);

  // Action wrappers with auto-advance
  const handleAccept = useCallback((id) => {
    const targetId = id || activeSuggestionId;
    if (!targetId) return;
    const targetSuggestion = flatSorted.find(s => s.id === targetId) || null;
    onAccept(targetId);
    if (targetSuggestion) {
      setDecisions(prev => [...prev, { suggestion: targetSuggestion, action: 'accept' }]);
    }
    // Auto-advance after a short delay to allow parent state to reconcile
    setTimeout(() => {
      focusNext();
    }, 200);
    // REMOVED: Local phase transition logic - let the useEffect handle this based on parent state
  }, [activeSuggestionId, onAccept, focusNext]);

  const handleReject = useCallback((id) => {
    const targetId = id || activeSuggestionId;
    if (!targetId) return;
    onReject(targetId);
    // Local UI state for decision tracking (optional, not source of truth)
    const targetSuggestion = flatSorted.find(s => s.id === targetId) || null;
    if (targetSuggestion) {
      setDecisions(prev => [...prev, { suggestion: targetSuggestion, action: 'reject' }]);
    }
    setTimeout(() => {
      focusNext();
    }, 120);
  }, [activeSuggestionId, onReject, focusNext, flatSorted]);

  // Keyboard navigation (N/P/A/R). Ignore when typing in inputs/textareas.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        focusNext();
      } else if (key === 'p') {
        e.preventDefault();
        focusPrev();
      } else if (key === 'a') {
        e.preventDefault();
        handleAccept();
      } else if (key === 'r') {
        e.preventDefault();
        handleReject();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusNext, focusPrev, handleAccept, handleReject]);

  // Renderers
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-purple-800">✨ Polish Studio</h2>
      <div className="text-xs text-gray-500">Focus View</div>
    </div>
  );

  // Brief removed in surgical repair. Immediately start when suggestions available.

  // Victory removed for MVP.

  const renderReport = () => (
    <EditorialReport
      suggestionsReviewed={decisions}
      initialText={initialText}
      finalText={finalText}
      onApplyWithLulu={onApplyWithLulu}
    />
  );

  // Overview removed for MVP scope

  const renderFocus = () => {
    const active = flatSorted.find(s => s.id === activeSuggestionId) || flatSorted[0] || null;
    if (!active) return null;
    const idx = flatSorted.findIndex(s => s.id === active.id);
    return (
      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
          <span>{idx + 1} / {flatSorted.length}</span>
          <div className="space-x-2">
            <button className="px-2 py-1 bg-gray-100 rounded" onClick={focusPrev}>Prev (P)</button>
            <button className="px-2 py-1 bg-gray-100 rounded" onClick={focusNext}>Next (N)</button>
          </div>
        </div>
        <SpecificEditCard
          key={active.id}
          edit={active}
          index={idx}
          onAccept={() => handleAccept(active.id)}
          onReject={() => handleReject(active.id)}
          onRevise={() => onRevise(active.id, active)}
          getEditMeta={getEditMeta}
        />
      </div>
    );
  };

  // DIAGNOSTIC: render-phase tracer
  console.log('🔍 [DIAGNOSTIC] Current render phase:', phase);

  return (
    <div className={`bg-white p-4 rounded shadow ${className}`}>
      {renderHeader()}
      {phase === 'report' ? (
        renderReport()
      ) : hasSuggestions ? (
        // Immediately enter review mode when suggestions exist
        (sessionStartedRef.current || handleStart(), renderFocus())
      ) : (
        // No suggestions to review (empty state). If session had started and suggestions were exhausted, phase will be 'report'.
        <div className="text-center p-6 text-gray-500">No suggestions at the moment.</div>
      )}
    </div>
  );
}


