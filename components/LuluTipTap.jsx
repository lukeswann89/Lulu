import React, { useState, useRef } from "react";
import { EditorContent, useEditor, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { v4 as uuidv4 } from "uuid";

// === Demo Suggestions (normally fetched or generated)
const initialSuggestions = [
  {
    id: uuidv4(),
    from: 1,
    to: 20,
    type: "Line",
    suggestion: "Could you please speak to me?",
    original: '"Please speak to me,"',
    why: "Makes it more polite.",
    author: "Lulu",
    color: "#fde68a",
    state: "pending",
  },
  {
    id: uuidv4(),
    from: 236,
    to: 260,
    type: "Line",
    suggestion: "Virginia had taken two years",
    original: "It had taken Virginia two years",
    why: "Places agency with Virginia.",
    author: "Lulu",
    color: "#dbeafe",
    state: "pending",
  }
];

// === Main Component
export default function LuluTipTap({
  initialText = `"Please speak to me," Sylvia begged Virginia the following day.

Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.

It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`,
  suggestions = initialSuggestions,
  readOnly = false
}) {
  const [manuscript, setManuscript] = useState(initialText);
  const [allSuggestions, setAllSuggestions] = useState(suggestions);
  const [showPending, setShowPending] = useState(true);
  const [showAccepted, setShowAccepted] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [log, setLog] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  // --- TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      // Custom suggestion extension here if needed
    ],
    content: manuscript,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setManuscript(editor.getText());
      // Auto-align suggestions here (see below for logic)
      alignSuggestions(editor.getText());
    }
  });

  // === Suggestion Alignment Logic
  function alignSuggestions(newText) {
    setAllSuggestions(sugs =>
      sugs.map(sug => {
        if (sug.state !== "pending") return sug;
        const idx = newText.indexOf(sug.original);
        if (idx === -1) return { ...sug, alignError: true };
        return { ...sug, from: idx, to: idx + sug.original.length, alignError: false };
      })
    );
  }

  // === Accept/Reject/Revise Logic
  function handleAccept(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending") return;
    // Replace text in TipTap
    const update = (oldText) => {
      return (
        oldText.slice(0, sug.from) +
        sug.suggestion +
        oldText.slice(sug.to)
      );
    };
    setManuscript(prev => {
      const next = update(prev);
      if (editor) editor.commands.setContent(next);
      return next;
    });
    setAllSuggestions(sugs =>
      sugs.map(s =>
        s.id === sugId ? { ...s, state: "accepted" } : s
      )
    );
    setLog(l => [
      ...l,
      {
        action: "accept",
        id: sugId,
        suggestion: sug,
        time: new Date()
      }
    ]);
    setLastAction("accept");
  }
  function handleReject(sugId) {
    setAllSuggestions(sugs =>
      sugs.map(s =>
        s.id === sugId ? { ...s, state: "rejected" } : s
      )
    );
    setLog(l => [
      ...l,
      {
        action: "reject",
        id: sugId,
        time: new Date()
      }
    ]);
    setLastAction("reject");
  }
  function handleRevise(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending") return;
    const newVal = prompt("Revise suggestion:", sug.suggestion);
    if (!newVal) return;
    setAllSuggestions(sugs =>
      sugs.map(s =>
        s.id === sugId ? { ...s, suggestion: newVal } : s
      )
    );
  }

  // === Highlighting Logic (decorations)
  function getDecorations() {
    // Inline highlight spans for suggestions
    if (!editor) return [];
    return allSuggestions
      .filter(
        s =>
          (showPending && s.state === "pending") ||
          (showAccepted && s.state === "accepted") ||
          (showRejected && s.state === "rejected")
      )
      .map((s, idx) => ({
        from: s.from,
        to: s.to,
        class: "lulu-highlight",
        "data-sug": s.id,
        style: `background: ${s.color || "#fef3c7"}; border-radius:4px; position:relative;`
      }));
  }
  // Apply highlights on every update
  if (editor) {
    editor.registerPlugin({
      props: {
        decorations: () => getDecorations()
      }
    });
  }

  // === UI
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        Lulu TipTap Editor (Experimental)
      </h2>

      {/* Editor area */}
      <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fff" }}>
        <EditorContent editor={editor} />
      </div>

      {/* Suggestion Filter */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ marginRight: 12 }}>
          <input type="checkbox" checked={showPending} onChange={e => setShowPending(e.target.checked)} /> Pending
        </label>
        <label style={{ marginRight: 12 }}>
          <input type="checkbox" checked={showAccepted} onChange={e => setShowAccepted(e.target.checked)} /> Accepted
        </label>
        <label>
          <input type="checkbox" checked={showRejected} onChange={e => setShowRejected(e.target.checked)} /> Rejected
        </label>
      </div>

      {/* Suggestion List */}
      <div style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0, color: "#2563eb" }}>Specific Edit Suggestions</h3>
        {allSuggestions
          .filter(
            s =>
              (showPending && s.state === "pending") ||
              (showAccepted && s.state === "accepted") ||
              (showRejected && s.state === "rejected")
          )
          .map((s, idx) => (
            <div
              key={s.id}
              style={{
                background: s.color || "#fef3c7",
                border: "2px solid #fcd34d",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                position: "relative"
              }}
            >
              <b>Original:</b> <span style={{ color: "#991b1b" }}>{s.original}</span>
              <br />
              <b>Suggestion:</b> <span style={{ color: "#2563eb" }}>{s.suggestion}</span>
              <br />
              <b>Why:</b> <span style={{ color: "#059669" }}>{s.why}</span>
              <br />
              <div style={{ marginTop: 6 }}>
                <button
                  disabled={s.state !== "pending"}
                  onClick={() => handleAccept(s.id)}
                  style={{ marginRight: 8, background: "#22c55e", color: "white", border: "none", borderRadius: 4, padding: "2px 10px", fontWeight: 600 }}
                >Accept</button>
                <button
                  disabled={s.state !== "pending"}
                  onClick={() => handleReject(s.id)}
                  style={{ marginRight: 8, background: "#ef4444", color: "white", border: "none", borderRadius: 4, padding: "2px 10px", fontWeight: 600 }}
                >Reject</button>
                <button
                  disabled={s.state !== "pending"}
                  onClick={() => handleRevise(s.id)}
                  style={{ background: "#facc15", color: "#1e293b", border: "none", borderRadius: 4, padding: "2px 10px", fontWeight: 600 }}
                >Revise</button>
              </div>
            </div>
          ))}
      </div>
      {/* Undo/Redo (stub) */}
      <div style={{ marginTop: 20, color: "#aaa", fontSize: 14 }}>
        <b>Coming Soon:</b> Batch accept, advanced undo/redo, multi-author, track changes, badges, more.
      </div>
    </div>
  );
}
