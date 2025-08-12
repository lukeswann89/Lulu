import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpecificEditCard from './SpecificEditCard';

/**
 * PolishStudio - MVP container for chronologically ordered Focus Edit workflow
 * - Reuses canonical SpecificEditCard for rendering
 * - Provides Focus/Overview toggle and keyboard navigation (N/P/A/R)
 * - Communicates activeSuggestionId upward via onActiveSuggestionChange
 */
export default function PolishStudio({
  suggestions = [],
  onAccept = () => {},
  onReject = () => {},
  onRevise = () => {},
  onActiveSuggestionChange = () => {},
  getEditMeta,
  className = ''
}) {
  // View state
  // MVP: Focus-only view
  const [phase, setPhase] = useState('brief'); // 'brief' | 'review' | 'victory'
  const [activeSuggestionId, setActiveSuggestionId] = useState(null);

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
      setPhase(prev => (prev === 'brief' ? 'brief' : 'victory'));
    } else if (phase === 'victory') {
      // If new suggestions arrive, return to brief
      setPhase('brief');
    }
  }, [hasSuggestions]);

  // Sync upward for Unified Suggestion State ghosting
  useEffect(() => {
    onActiveSuggestionChange(activeSuggestionId);
  }, [activeSuggestionId, onActiveSuggestionChange]);

  // Start review handler
  const handleStart = useCallback(() => {
    setPhase('review');
    setViewMode('focus');
    if (flatSorted.length > 0) setActiveSuggestionId(flatSorted[0].id);
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
    onAccept(targetId);
    // Auto-advance after a short delay to allow parent state to reconcile
    setTimeout(() => {
      focusNext();
    }, 200);
  }, [activeSuggestionId, onAccept, focusNext]);

  const handleReject = useCallback((id) => {
    const targetId = id || activeSuggestionId;
    if (!targetId) return;
    onReject(targetId);
    setTimeout(() => {
      focusNext();
    }, 120);
  }, [activeSuggestionId, onReject, focusNext]);

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

  const renderBrief = () => (
    <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
      <div className="text-4xl mb-3">🛫</div>
      <p className="text-lg font-semibold text-blue-800 mb-2">Pre-Flight Brief</p>
      <p className="text-sm text-blue-700 mb-4">{hasSuggestions ? `${flatSorted.length} suggestions ready in chronological order.` : 'No suggestions at the moment.'}</p>
      {hasSuggestions && (
        <button
          onClick={handleStart}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Start Review (N/P/A/R)
        </button>
      )}
    </div>
  );

  const renderVictory = () => (
    <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
      <div className="text-4xl mb-3">🎉</div>
      <p className="text-lg font-semibold text-green-800 mb-2">Victory! All suggestions processed.</p>
      <p className="text-sm text-green-700">Enjoy the polish.</p>
    </div>
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

  return (
    <div className={`bg-white p-4 rounded shadow ${className}`}>
      {renderHeader()}
      {!hasSuggestions ? (
        renderBrief()
      ) : phase === 'brief' ? (
        renderBrief()
      ) : phase === 'victory' ? (
        renderVictory()
      ) : renderFocus()}
    </div>
  );
}


