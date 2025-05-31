// components/ManuscriptEditor.jsx
"use client";
import React, { useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import StatsPanel from "./StatsPanel";
import SuggestionCard from "./SuggestionCard";
import UndoManager from "../utils/undoManager";
import { findAllPositions, realignSuggestions } from "../utils/suggestionUtils";

// Dynamically load TipTap
const LuluTipTap = dynamic(() => import("./LuluTipTap"), { ssr: false });

const defaultText = `Paste or type your manuscript here. Start editing...`;

export default function ManuscriptEditor({ initialText = defaultText, initialSuggestions = [] }) {
  const [manuscriptText, setManuscriptText] = useState(initialText);
  const [allSuggestions, setAllSuggestions] = useState(initialSuggestions);
  const [originalText] = useState(initialText); // for authenticity
  const undoManager = useRef(new UndoManager());

  // Basic stats (not required if using StatsPanel but kept for future expansion)
  const wordCount = useMemo(() => manuscriptText.split(/\s+/).filter(Boolean).length, [manuscriptText]);
  const readingTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 250)), [wordCount]);

  // --- Authenticity calculation (used in StatsPanel, too, but keeping for clarity) ---
  function calculateAuthenticity({ originalText, currentText, suggestions }) {
    if (originalText === currentText) return 100;
    let total = originalText.length;
    let changed = 0;
    suggestions.forEach(sug => {
      if (sug.state === "accepted") {
        changed += sug.suggestion.length;
      }
      if (sug.state === "revised") {
        changed += Math.floor(sug.suggestion.length / 2);
      }
    });
    const percent = Math.max(0, Math.round(100 - (changed / total) * 100));
    return percent;
  }
  const authenticity = calculateAuthenticity({ originalText, currentText: manuscriptText, suggestions: allSuggestions });

  // --- Manuscript actions ---
  function handleSetText(val) {
    setManuscriptText(val);
    setAllSuggestions([]); // Clear suggestions on new text for now
  }

  function handlePaste() {
    const val = prompt("Paste manuscript text:");
    if (val) handleSetText(val);
  }

  function handleClear() {
    if (window.confirm("Clear current manuscript?")) {
      handleSetText(defaultText);
    }
  }

  // -- Example GPT call placeholder --
  async function handleGetSuggestions() {
    // This is where you'd call your API or GPT backend
    setAllSuggestions([
      {
        id: "gpt-demo-1",
        original: "Paste or type your manuscript here.",
        suggestion: "Type or paste your story here.",
        why: "Friendlier invitation.",
        color: "#fde68a",
        state: "pending",
        from: 0,
        to: 34
      }
    ]);
  }

  // --- Suggestion handlers for SuggestionCard ---
  function handleAccept(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending") return;
    undoManager.current.save({ text: manuscriptText, suggestions: allSuggestions, sugId, actionType: "accept" });
    // Find and replace original in text
    const positions = findAllPositions(manuscriptText, sug.original);
    if (!positions.length) return;
    const { from, to } = positions[0];
    const newText = manuscriptText.slice(0, from) + sug.suggestion + manuscriptText.slice(to);
    setManuscriptText(newText);
    setAllSuggestions(prev => {
      const updated = prev.map(s => s.id === sugId ? { ...s, state: "accepted" } : s);
      return realignSuggestions(newText, updated);
    });
  }
  function handleReject(sugId) {
    setAllSuggestions(prev => prev.map(s => s.id === sugId ? { ...s, state: "rejected" } : s));
  }
  function handleRevise(sugId, val) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending") return;
    undoManager.current.save({ text: manuscriptText, suggestions: allSuggestions, sugId, actionType: "revise" });
    const positions = findAllPositions(manuscriptText, sug.original);
    if (!positions.length) return;
    const { from, to } = positions[0];
    const newText = manuscriptText.slice(0, from) + val + manuscriptText.slice(to);
    setManuscriptText(newText);
    setAllSuggestions(prev => {
      const updated = prev.map(s => s.id === sugId ? { ...s, state: "revised", suggestion: val } : s);
      return realignSuggestions(newText, updated);
    });
  }
  function handleCardUndo(sugId) {
    const snapshot = undoManager.current.undo(sugId);
    if (snapshot) {
      setManuscriptText(snapshot.text);
      setAllSuggestions(snapshot.suggestions);
    }
  }

  // -- Render --
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>Lulu Manuscript Editor</h2>
      
      {/* StatsPanel for word count, reading time, authenticity */}
      <StatsPanel
        originalText={originalText}
        currentText={manuscriptText}
        suggestions={allSuggestions}
      />

      {/* Control buttons */}
      <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <button onClick={handlePaste} style={{ background: "#a78bfa", color: "#fff", padding: "7px 18px", borderRadius: 7, fontWeight: 600, border: "none" }}>Paste</button>
        <button onClick={handleClear} style={{ background: "#ef4444", color: "#fff", padding: "7px 18px", borderRadius: 7, fontWeight: 600, border: "none" }}>Clear</button>
        <button onClick={handleGetSuggestions} style={{ background: "#2563eb", color: "#fff", padding: "7px 18px", borderRadius: 7, fontWeight: 600, border: "none" }}>Get Suggestions</button>
      </div>

      {/* Main TipTap Editor: use manuscriptText as content */}
      <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fff" }}>
        <LuluTipTap
          content={manuscriptText}
          setContent={setManuscriptText}
          suggestions={allSuggestions}
          setSuggestions={setAllSuggestions}
        />
      </div>
      
      <h3 style={{ marginTop: 0, color: "#2563eb" }}>Specific Edit Suggestions</h3>
      <div>
        {allSuggestions.map((sug, idx) => (
          <SuggestionCard
            key={sug.id}
            sug={sug}
            idx={idx}
            onAccept={() => handleAccept(sug.id)}
            onReject={() => handleReject(sug.id)}
            onRevise={(idx, val) => handleRevise(sug.id, val)}
            onUndo={() => handleCardUndo(sug.id)}
            activeIdx={null}
            setActiveIdx={() => { }}
          />
        ))}
      </div>
    </div>
  );
}
