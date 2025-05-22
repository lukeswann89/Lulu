import React, { useState, useRef, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";

const defaultText = `"Please speak to me," Sylvia begged Virginia the following day.

Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.

It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`;

const initialSuggestions = [
  {
    id: uuidv4(),
    original: '"Please speak to me,"',
    suggestion: 'Could you please speak to me?',
    contextualInsert: 'Could you please speak to me? Sylvia begged Virginia the following day.',
    why: "Makes it more polite.",
    color: "#fde68a",
    state: "pending",
    from: 0,
    to: 25
  },
  {
    id: uuidv4(),
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    contextualInsert: "Virginia had taken two years to find her voice after that fateful day—two years to speak to another person.",
    why: "Places agency with Virginia.",
    color: "#dbeafe",
    state: "pending",
    from: 236,
    to: 267
  }
];

export default function LuluTipTap({
  initialText = defaultText,
  readOnly = false
}) {
  const [allSuggestions, setAllSuggestions] = useState(initialSuggestions);
  const [history, setHistory] = useState([]);
  const cardRefs = useRef({});

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      new Plugin({
        props: {
          decorations: (state) => {
            const decos = [];
            allSuggestions.forEach(s => {
              if (!s || s.from == null || s.to == null || s.state !== "pending") return;
              decos.push(
                Decoration.inline(s.from, s.to, {
                  class: "lulu-highlight",
                  "data-sug": s.id
                })
              );
            });
            return DecorationSet.create(state.doc, decos);
          }
        }
      })
    ],
    content: initialText,
    editable: !readOnly
  });

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("luluHighlightStyle")) {
      const style = document.createElement("style");
      style.id = "luluHighlightStyle";
      style.innerHTML = `.lulu-highlight { background: #fde68a; border-radius: 3px; padding: 0 2px; cursor: pointer; }`;
      document.head.appendChild(style);
    }
  }, []);

  function realignSuggestions(text, prev) {
    const used = [];
    return prev.map(sug => {
      if (sug.state !== 'pending') return sug;
      const idx = text.indexOf(sug.original);
      if (idx === -1 || used.includes(idx)) return { ...sug, alignError: true };
      used.push(idx);
      return { ...sug, from: idx, to: idx + sug.original.length, alignError: false };
    });
  }

  function handleAccept(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending" || !editor) return;
    const fullText = editor.getText();
    const needsQuote = sug.original.trim().startsWith('"') && !sug.contextualInsert.trim().startsWith('"');
    const contextual = needsQuote ? `"${sug.contextualInsert}"` : sug.contextualInsert;
    const updated = fullText.slice(0, sug.from) + contextual + fullText.slice(sug.to);
    editor.commands.setContent(updated);
    const realigned = realignSuggestions(updated, allSuggestions.map(s => s.id === sugId ? { ...s, state: "accepted" } : s));
    setHistory(h => [...h, { text: fullText, suggestions: allSuggestions }]);
    setAllSuggestions(realigned);
    editor.view.dispatch(editor.view.state.tr);
  }

  function handleReject(sugId) {
    const fullText = editor.getText();
    const updated = allSuggestions.map(s => s.id === sugId ? { ...s, state: "rejected" } : s);
    setHistory(h => [...h, { text: fullText, suggestions: allSuggestions }]);
    setAllSuggestions(updated);
    editor.view.dispatch(editor.view.state.tr);
  }

  function handleRevise(sugId) {
    const sug = allSuggestions.find(s => s.id === sugId);
    if (!sug || sug.state !== "pending") return;
    const newVal = prompt("Revise full sentence:", sug.contextualInsert);
    if (!newVal) return;
    const fullText = editor.getText();
    const updated = allSuggestions.map(s => s.id === sugId ? { ...s, contextualInsert: newVal, state: "revised" } : s);
    setHistory(h => [...h, { text: fullText, suggestions: allSuggestions }]);
    setAllSuggestions(updated);
    editor.view.dispatch(editor.view.state.tr);
  }

  function handleUndo() {
    if (!history.length) return;
    const last = history[history.length - 1];
    setAllSuggestions(last.suggestions);
    editor.commands.setContent(last.text);
    setHistory(h => h.slice(0, -1));
    editor.view.dispatch(editor.view.state.tr);
  }

  function handleCardUndo(sugId) {
    setAllSuggestions(sugs => sugs.map(s => s.id === sugId ? { ...s, state: "pending" } : s));
    editor.view.dispatch(editor.view.state.tr);
  }

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: 24, background: "#f9fafb", borderRadius: 12 }}>
      <h2 style={{ color: "#9333ea", fontWeight: 800, fontSize: 28, marginBottom: 24 }}>
        Lulu TipTap Editor (Experimental)
      </h2>

      <div style={{ border: "1.5px solid #a78bfa", borderRadius: 8, padding: 12, marginBottom: 16, background: "#fff" }}>
        <EditorContent editor={editor} />
      </div>

      <button onClick={handleUndo} style={{ background: "#a78bfa", color: "white", padding: "6px 16px", borderRadius: 6, fontWeight: 600, marginBottom: 20 }}>Undo</button>

      <h3 style={{ marginTop: 0, color: "#2563eb" }}>Specific Edit Suggestions</h3>
      {allSuggestions.map((s, idx) => (
        <div
          key={s.id}
          ref={el => cardRefs.current[s.id] = el}
          style={{
            background: s.color || "#fef3c7",
            border: "2px solid #fcd34d",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            position: "relative",
            opacity: s.state === "pending" ? 1 : 0.6
          }}
        >
          <div style={{
            position: "absolute",
            top: 12,
            right: 16,
            fontSize: 16,
            color: "#a16207",
            background: "#fde68a",
            borderRadius: 7,
            padding: "0 7px",
            fontWeight: 700
          }}>#{idx + 1}</div>

          {s.state === "pending" ? (
            <>
              <div><b>Original:</b> <span style={{ color: "#991b1b" }}>{s.original}</span></div>
              <div><b>Suggestion:</b> <span style={{ color: "#2563eb" }}>{s.suggestion}</span></div>
              <div><b>Why:</b> <span style={{ color: "#059669" }}>{s.why}</span></div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => handleAccept(s.id)} style={{ marginRight: 10, background: "#22c55e", color: "white", padding: "2px 14px", borderRadius: 4, border: "none", fontWeight: 600 }}>Accept</button>
                <button onClick={() => handleReject(s.id)} style={{ marginRight: 10, background: "#ef4444", color: "white", padding: "2px 14px", borderRadius: 4, border: "none", fontWeight: 600 }}>Reject</button>
                <button onClick={() => handleRevise(s.id)} style={{ background: "#facc15", color: "#1e293b", padding: "2px 14px", borderRadius: 4, border: "none", fontWeight: 600 }}>Revise</button>
              </div>
            </>
          ) : (
            <>
              <div><b>[{s.state.toUpperCase()}]</b> Original: <span style={{ color: "#991b1b" }}>{s.original}</span></div>
              <div>Suggestion: <span style={{ color: "#2563eb" }}>{s.suggestion}</span></div>
              <button onClick={() => handleCardUndo(s.id)} style={{ marginTop: 8, background: "#a78bfa", color: "white", padding: "2px 10px", borderRadius: 4, fontWeight: 600, border: "none" }}>Undo</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
