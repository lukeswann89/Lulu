// /pages/experimental.js
import { useState, useRef, useEffect } from "react";
import LuluTipTap from '../components/LuluTipTap';
// -- Test Passage (can be edited by user)
const defaultText =
  `"Please speak to me," Sylvia begged Virginia the following day.
Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.
It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`;
// -- Edits: original = EXACT string to match
const initialEdits = [
  {
    start: 0, end: 0,
    editType: "Line",
    original: '"Please speak to me,"',
    suggestion: '"Could you please speak to me?"',
    why: "Makes it more polite.",
    state: "pending"
  },
  {
    start: 0, end: 0,
    editType: "Line",
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    why: "Places agency with Virginia.",
    state: "pending"
  }
];
// Helper: Find and sort pending edits by start offset
function sortedEdits(edits, text) {
  if (!edits.length) return [];
  return [...edits]
    .map((e, i) => ({
      ...e,
      idx: i,
      original: text.slice(e.start, e.end) || e.original
    }))
    .filter(e => e.state === "pending")
    .sort((a, b) => a.start - b.start);
}
// Helper: Check for overlaps in edits (warning only)
function findOverlaps(edits) {
  const sorted = sortedEdits(edits, "");
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return true;
  }
  return false;
}
// Main Highlight logic
function highlightManuscript(text, edits, activeIdx, showNumbers) {
  if (!edits?.length) return text;
  let out = text;
  const sorted = sortedEdits(edits, text);
  [...sorted].reverse().forEach((e, displayIdx) => {
    const before = out.slice(0, e.start);
    const target = out.slice(e.start, e.end);
    const after = out.slice(e.end);
    const sup = showNumbers
      ? `<sup style="font-size:0.85em;vertical-align:super;color:#a16207;">${sorted.length - displayIdx}</sup>`
      : "";
    out =
      before +
      `<mark
        data-sug="${e.idx}"
        class="lulu-highlight"
        style="background: #ffe29b; padding:0 2px; border-radius:3px;${activeIdx === e.idx ? 'outline:2px solid #6366f1;animation:luluPulse .7s;' : ''}"
      >${target}${sup}</mark>` +
      after;
  });
  return out;
}
// Utility: Align all edits to the current manuscript by searching for their original text.
function alignEditOffsetsToText(text, edits) {
  let usedRanges = [];
  return edits.map(edit => {
    if (edit.state !== "pending" || !edit.original) return edit;
    const safeOriginal = edit.original.replace(/[\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(safeOriginal);
    let match, start = -1, end = -1;
    let lastEnd = 0;
    while ((match = regex.exec(text.slice(lastEnd)))) {
      let foundStart = lastEnd + match.index;
      let foundEnd = foundStart + match[0].length;
      if (!usedRanges.some(rng => !(foundEnd <= rng[0] || foundStart >= rng[1]))) {
        start = foundStart;
        end = foundEnd;
        usedRanges.push([start, end]);
        break;
      }
      lastEnd = foundEnd;
    }
    if (start === -1 || end === -1) {
      return { ...edit, alignError: true, alignMsg: "Not found in manuscript!" };
    }
    return { ...edit, start, end, alignError: false };
  });
}
export default function Experimental() {
  const [text, setText] = useState(defaultText);
  const [edits, setEdits] = useState(initialEdits);
  const [showNumbers, setShowNumbers] = useState(true);
  const [activeIdx, setActiveIdx] = useState(null);
  const [history, setHistory] = useState([]);
  const cardRefs = useRef([]);
  // Animation keyframes (SSR-safe)
  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("luluPulseKeyframes")) {
      const style = document.createElement("style");
      style.id = "luluPulseKeyframes";
      style.innerHTML = `
        @keyframes luluPulse { 0%{outline-width:3px} 100%{outline-width:0} }
        .lulu-highlight:hover { outline: 2px solid #a21caf !important; animation: luluPulse .6s;}
      `;
      document.head.appendChild(style);
    }
  }, []);
  useEffect(() => {
    if (activeIdx != null && cardRefs.current[activeIdx]) {
      cardRefs.current[activeIdx].scrollIntoView({ behavior: "smooth", block: "center" });
      cardRefs.current[activeIdx].focus();
    }
  }, [activeIdx]);
  // ⭐️ Auto-align edits whenever text is changed
  useEffect(() => {
    setEdits(prevEdits => alignEditOffsetsToText(text, prevEdits));
    // Only aligns pending edits; accepted/rejected stay as-is.
    // If you want to reset history when text is changed, add setHistory([]) here too.
  }, [text]);
  const sorted = sortedEdits(edits, text);
  function acceptEdit(idx) {
    const edit = edits[idx];
    if (!edit || edit.state !== "pending") return;
    setHistory(h => [...h, { text, edits: JSON.parse(JSON.stringify(edits)) }]);
    const before = text.slice(0, edit.start);
    const after = text.slice(edit.end);
    const newText = before + (edit.suggestion || "") + after;
    let newEdits = edits.map((e, i) =>
      i === idx ? { ...e, state: "accepted" } : e
    );
    // Re-align after edit
    newEdits = alignEditOffsetsToText(newText, newEdits);
    setText(newText);
    setEdits(newEdits);
    setActiveIdx(null);
  }
  function rejectEdit(idx) {
    setHistory(h => [...h, { text, edits: JSON.parse(JSON.stringify(edits)) }]);
    setEdits(eds => eds.map((e, i) =>
      i === idx ? { ...e, state: "rejected" } : e
    ));
    setActiveIdx(null);
  }
  function handleRevise(idx) {
    const edit = edits[idx];
    const revised = prompt("Enter your revision for the highlighted text:", edit.suggestion || "");
    if (revised != null) {
      setHistory(h => [...h, { text, edits: JSON.parse(JSON.stringify(edits)) }]);
      const before = text.slice(0, edit.start);
      const after = text.slice(edit.end);
      const newText = before + revised + after;
      let newEdits = edits.map((e, i) =>
        i === idx ? { ...e, state: "revised", suggestion: revised } : e
      );
      newEdits = alignEditOffsetsToText(newText, newEdits);
      setText(newText);
      setEdits(newEdits);
      setActiveIdx(null);
    }
  }
  function handleUndo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setText(prev.text);
    setEdits(prev.edits);
    setHistory(h => h.slice(0, -1));
    setActiveIdx(null);
  }
  function handleManuscriptClick(e) {
    const mark = e.target.closest(".lulu-highlight");
    if (mark && mark.dataset.sug != null) {
      setActiveIdx(+mark.dataset.sug);
      setTimeout(() => setActiveIdx(null), 1100);
    }
  }
  function handleCardHover(idx, hovering) {
    setActiveIdx(hovering ? idx : null);
  }
  const hasOverlap = findOverlaps(edits);
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        Lulu Experimental (Highlight Demo)
      </h2>
      <label style={{ fontWeight: 600, display: "block", marginBottom: 10 }}>
        Manuscript (with highlights)
      </label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{
          border: "1.5px solid #a78bfa",
          minHeight: 150,
          fontFamily: "serif",
          background: "#fff",
          borderRadius: 8,
          padding: 16,
          fontSize: 18,
          marginBottom: 10,
          width: "100%",
          whiteSpace: "pre-wrap",
          outline: activeIdx != null ? "2px solid #a21caf" : "none",
          transition: "outline .3s",
          resize: "vertical"
        }}
      />
      <div
        tabIndex={-1}
        style={{
          border: "1.5px solid #a78bfa",
          minHeight: 60,
          fontFamily: "serif",
          background: "#fff",
          borderRadius: 8,
          padding: 16,
          fontSize: 18,
          marginBottom: 24,
          whiteSpace: "pre-wrap",
          outline: activeIdx != null ? "2px solid #a21caf" : "none",
          transition: "outline .3s"
        }}
        onClick={handleManuscriptClick}
        dangerouslySetInnerHTML={{
          __html: highlightManuscript(text, edits, activeIdx, showNumbers),
        }}
      />
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setEdits(alignEditOffsetsToText(text, edits))}
          style={{
            marginRight: 12,
            background: "#e0e7ff",
            color: "#1e293b",
            padding: "4px 14px",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            marginBottom: 12
          }}
        >
          Align All Suggestions
        </button>
        <label>
          <input
            type="checkbox"
            checked={showNumbers}
            onChange={e => setShowNumbers(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Show Numbered Badges
        </label>
        <button
          onClick={handleUndo}
          disabled={!history.length}
          style={{
            marginLeft: 18,
            background: "#d1d5db",
            color: "#312e81",
            padding: "4px 18px",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            opacity: history.length ? 1 : 0.5,
            cursor: history.length ? "pointer" : "not-allowed"
          }}
        >Undo</button>
      </div>
      {hasOverlap && (
        <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 12 }}>
          ⚠️ Warning: Some suggestions overlap. Please resolve overlaps.
        </div>
      )}
      <div>
        <h3 style={{ marginTop: 0, color: "#2563eb" }}>Specific Edit Suggestions</h3>
        {sorted.map((e, displayIdx) => (
          <div
            key={e.idx}
            ref={el => cardRefs.current[e.idx] = el}
            tabIndex={0}
            onMouseEnter={() => handleCardHover(e.idx, true)}
            onMouseLeave={() => handleCardHover(e.idx, false)}
            style={{
              background: "#fef3c7",
              border: "2px solid #fcd34d",
              borderRadius: 8,
              padding: 14,
              marginBottom: 12,
              outline: activeIdx === e.idx ? "2.5px solid #a21caf" : "",
              transition: "outline .25s",
              position: "relative"
            }}
          >
            <div style={{
              position: "absolute",
              top: 12, right: 16,
              fontSize: 16,
              color: "#a16207",
              background: "#fde68a",
              borderRadius: 7,
              padding: "0 7px",
              fontWeight: 700
            }}>#{displayIdx + 1}</div>
            <div>
              <b>Original:</b> <span style={{ color: "#991b1b" }}>{e.original}</span>
              {e.alignError && (
                <div style={{ color: "#ef4444", fontWeight: 700, marginTop: 4 }}>
                  ⚠️ Not found in manuscript!
                </div>
              )}
            </div>
            <div>
              <b>Suggestion:</b> <span style={{ color: "#2563eb" }}>{e.suggestion}</span>
            </div>
            <div>
              <b>Why:</b> <span style={{ color: "#059669" }}>{e.why}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                disabled={edits[e.idx].state !== "pending"}
                onClick={() => acceptEdit(e.idx)}
                style={{
                  marginRight: 10,
                  background: "#22c55e",
                  color: "white",
                  padding: "2px 14px",
                  borderRadius: 4,
                  border: "none",
                  fontWeight: 600,
                  opacity: edits[e.idx].state === "pending" ? 1 : 0.4,
                  cursor: edits[e.idx].state === "pending" ? "pointer" : "not-allowed"
                }}
              >
                Accept
              </button>
              <button
                disabled={edits[e.idx].state !== "pending"}
                onClick={() => rejectEdit(e.idx)}
                style={{
                  marginRight: 10,
                  background: "#ef4444",
                  color: "white",
                  padding: "2px 14px",
                  borderRadius: 4,
                  border: "none",
                  fontWeight: 600,
                  opacity: edits[e.idx].state === "pending" ? 1 : 0.4,
                  cursor: edits[e.idx].state === "pending" ? "pointer" : "not-allowed"
                }}
              >
                Reject
              </button>
              <button
                disabled={edits[e.idx].state !== "pending"}
                onClick={() => handleRevise(e.idx)}
                style={{
                  background: "#facc15",
                  color: "#1e293b",
                  padding: "2px 14px",
                  borderRadius: 4,
                  border: "none",
                  fontWeight: 600,
                  opacity: edits[e.idx].state === "pending" ? 1 : 0.4,
                  cursor: edits[e.idx].state === "pending" ? "pointer" : "not-allowed"
                }}
              >
                Revise
              </button>
            </div>
          </div>
        ))}
        {/* Accepted/revised feedback */}
        <div>
          {edits.filter(e => ["accepted", "revised"].includes(e.state)).map((e, i) => (
            <div
              key={i}
              style={{
                background: "#e0e7ff",
                border: "1px solid #a5b4fc",
                borderRadius: 8,
                padding: 10,
                marginBottom: 7,
                fontSize: 14,
                color: "#4b5563",
              }}
            >
              <b>[ACCEPTED]</b> Original: <span style={{ color: "#991b1b" }}>{text.slice(e.start, e.end)}</span> → Suggestion: <span style={{ color: "#2563eb" }}>{e.suggestion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}