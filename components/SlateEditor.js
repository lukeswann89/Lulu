import React, { useMemo, useState, useCallback, useRef } from "react";
import { createEditor, Transforms, Editor, Text, Range, Element as SlateElement } from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";

// --- Suggestion Icons
const TYPE_ICONS = {
  Developmental: "🌍",
  Structural: "🪜",
  Line: "📜",
  Copy: "🔬",
  Proof: "🧽"
};
const TYPE_COLORS = {
  Developmental: "#b2ddfd",
  Structural: "#fde68a",
  Line: "#fef3c7",
  Copy: "#f1f5f9",
  Proof: "#e0e7ff"
};

// --- Test Data
const defaultValue = [
  {
    type: "paragraph",
    children: [
      { text: '"Please speak to me," Sylvia begged Virginia the following day.' }
    ]
  },
  {
    type: "paragraph",
    children: [
      { text: "Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion." }
    ]
  },
  {
    type: "paragraph",
    children: [
      { text: "It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again." }
    ]
  }
];

const initialSuggestions = [
  {
    id: 1,
    type: "Line",
    icon: "📜",
    color: "#fef3c7",
    original: '"Please speak to me,"',
    suggestion: '"Could you please speak to me?"',
    why: "Makes it more polite.",
    state: "pending"
  },
  {
    id: 2,
    type: "Line",
    icon: "📜",
    color: "#fef3c7",
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    why: "Places agency with Virginia.",
    state: "pending"
  }
];

// --- Helpers
const getSuggestionColor = type => TYPE_COLORS[type] || "#e0e7ff";
const getSuggestionIcon = type => TYPE_ICONS[type] || "💡";

const withSuggestions = editor => {
  const { isInline } = editor;
  editor.isInline = element => (element.type === "suggestion" ? true : isInline(element));
  return editor;
};

// --- Inline Highlight Render
const SuggestionLeaf = ({ attributes, children, leaf, suggestionIdx, active, showNumbers }) => {
  if (!leaf.suggestionMark) return <span {...attributes}>{children}</span>;
  return (
    <mark
      {...attributes}
      style={{
        background: "#ffe29b",
        padding: "0 2px",
        borderRadius: "3px",
        outline: active ? "2px solid #6366f1" : "none",
        cursor: "pointer",
        position: "relative"
      }}
      data-sug={suggestionIdx}
      className="lulu-highlight"
    >
      {children}
      {showNumbers && (
        <sup
          style={{
            fontSize: "0.85em",
            verticalAlign: "super",
            color: "#a16207",
            marginLeft: 2
          }}
        >
          {suggestionIdx + 1}
        </sup>
      )}
    </mark>
  );
};

// --- Slate Toolbar
const ToolbarButton = ({ format, icon, onClick }) => {
  const editor = useSlate();
  return (
    <button
      onMouseDown={event => {
        event.preventDefault();
        onClick(editor, format);
      }}
      style={{
        background: "#f3f4f6",
        border: "none",
        borderRadius: 5,
        marginRight: 8,
        padding: "4px 12px",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer"
      }}
    >
      {icon}
    </button>
  );
};

const toggleMark = (editor, format) => {
  const isActive = Editor.marks(editor)?.[format];
  if (isActive) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
};

const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  return (
    <button
      onMouseDown={event => {
        event.preventDefault();
        const isActive = isBlockActive(editor, format);
        Transforms.setNodes(
          editor,
          { type: isActive ? "paragraph" : format },
          { match: n => Editor.isBlock(editor, n) }
        );
      }}
      style={{
        background: "#f3f4f6",
        border: "none",
        borderRadius: 5,
        marginRight: 8,
        padding: "4px 12px",
        fontWeight: 600,
        fontSize: 16,
        cursor: "pointer"
      }}
    >
      {icon}
    </button>
  );
};
const isBlockActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format
  });
  return !!match;
};

// --- Main Editor Component
export default function SlateEditor() {
  const editor = useMemo(() => withSuggestions(withReact(createEditor())), []);
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [activeIdx, setActiveIdx] = useState(null);
  const [showNumbers, setShowNumbers] = useState(true);
  const [focusMode, setFocusMode] = useState(false); // Overview or Focus
  const [focusSuggestion, setFocusSuggestion] = useState(0); // index in suggestions
  const [history, setHistory] = useState([]);
  const editorRef = useRef();

  // Helper: Mark inline suggestions as leaves
  const decorate = useCallback(
    ([node, path]) => {
      const ranges = [];
      if (!Text.isText(node)) return ranges;
      let offset = 0;
      let text = node.text;
      suggestions.forEach((sug, idx) => {
        if (sug.state !== "pending" || !sug.original) return;
        const orig = sug.original;
        let start = text.indexOf(orig, offset);
        if (start !== -1) {
          ranges.push({
            suggestionMark: true,
            suggestionIdx: idx,
            anchor: { path, offset: start },
            focus: { path, offset: start + orig.length }
          });
          offset = start + orig.length;
        }
      });
      return ranges;
    },
    [suggestions]
  );

  // Accept/Reject/Revise logic
  const applySuggestion = (idx, action, customText) => {
    const sug = suggestions[idx];
    if (!sug || sug.state !== "pending") return;
    setHistory(h => [...h, { value: JSON.parse(JSON.stringify(value)), suggestions: JSON.parse(JSON.stringify(suggestions)) }]);
    let newValue = [...value];
    if (action === "accept" || action === "revise") {
      // Replace first instance in document
      for (let n = 0; n < newValue.length; n++) {
        const node = newValue[n];
        if (node.type !== "paragraph") continue;
        const idxStart = node.children[0].text.indexOf(sug.original);
        if (idxStart !== -1) {
          node.children[0].text =
            node.children[0].text.slice(0, idxStart) +
            (action === "accept" ? sug.suggestion : customText) +
            node.children[0].text.slice(idxStart + sug.original.length);
          break;
        }
      }
    }
    const newSugs = suggestions.map((s, i) =>
      i === idx
        ? {
            ...s,
            state: action === "accept" ? "accepted" : action === "revise" ? "revised" : "rejected",
            ...(action === "revise" && customText ? { suggestion: customText } : {})
          }
        : s
    );
    setValue(newValue);
    setSuggestions(newSugs);
    setActiveIdx(null);
    setFocusSuggestion(0);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setValue(prev.value);
    setSuggestions(prev.suggestions);
    setHistory(h => h.slice(0, -1));
    setActiveIdx(null);
  };

  // --- Render
  return (
    <div style={{ display: "flex", maxWidth: 1300, margin: "32px auto", gap: 32 }}>
      {/* Main Editor & Manuscript */}
      <div style={{ flex: 1.2, background: "#fff", borderRadius: 18, boxShadow: "0 2px 8px #e0e7ef", padding: 28 }}>
        <h2 style={{ fontWeight: 800, color: "#6d28d9", fontSize: 26, marginBottom: 16 }}>Manuscript</h2>
        <Slate editor={editor} value={value} onChange={v => setValue(v)}>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <ToolbarButton format="bold" icon={<b>B</b>} onClick={toggleMark} />
            <ToolbarButton format="italic" icon={<i>I</i>} onClick={toggleMark} />
            <BlockButton format="bulleted-list" icon="• Bulleted List" />
            <BlockButton format="numbered-list" icon="1. Numbered List" />
            <BlockButton format="heading-one" icon="H1" />
            <BlockButton format="heading-three" icon="H3" />
            <button
              style={{ marginLeft: 14, marginRight: 6, fontWeight: 600, fontSize: 15, background: "#f1f5f9", border: "none", borderRadius: 6, padding: "3px 14px", cursor: "pointer" }}
              onClick={handleUndo}
              disabled={!history.length}
            >
              ⎌ Undo
            </button>
          </div>
          <Editable
            decorate={decorate}
            renderLeaf={props => (
              <SuggestionLeaf
                {...props}
                suggestionIdx={props.leaf.suggestionIdx}
                active={activeIdx === props.leaf.suggestionIdx}
                showNumbers={showNumbers}
              />
            )}
            placeholder="Start typing your manuscript..."
            spellCheck
            style={{
              fontSize: 18,
              fontFamily: "serif",
              minHeight: 180,
              border: "1.5px solid #a78bfa",
              borderRadius: 8,
              padding: 18,
              background: "#fff",
              outline: "none",
              marginBottom: 18,
              whiteSpace: "pre-wrap"
            }}
            onClick={e => {
              const el = e.target.closest(".lulu-highlight");
              if (el?.dataset?.sug != null) setActiveIdx(Number(el.dataset.sug));
            }}
          />
        </Slate>
        <label style={{ display: "block", marginTop: 10 }}>
          <input
            type="checkbox"
            checked={showNumbers}
            onChange={e => setShowNumbers(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Show Numbered Badges
        </label>
      </div>

      {/* Suggestion Panel */}
      <div style={{ flex: 0.9, background: "#fafcff", borderRadius: 18, boxShadow: "0 2px 8px #e0e7ef", padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button style={{
            background: "#a78bfa", color: "#fff", border: "none", borderRadius: 8, padding: "6px 22px",
            fontWeight: 600, fontSize: 16, cursor: "pointer"
          }}>
            Return to Edit Options
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setFocusMode(false)} style={{
              fontWeight: 700,
              background: !focusMode ? "#8b5cf6" : "#ede9fe",
              color: !focusMode ? "#fff" : "#6d28d9",
              border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 15, marginRight: 6, cursor: "pointer"
            }}>Overview</button>
            <button onClick={() => setFocusMode(true)} style={{
              fontWeight: 700,
              background: focusMode ? "#8b5cf6" : "#ede9fe",
              color: focusMode ? "#fff" : "#6d28d9",
              border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 15, cursor: "pointer"
            }}>Focus View</button>
          </div>
        </div>
        {/* Suggestion Cards */}
        {!focusMode ? (
          <div>
            {["Developmental", "Structural", "Line", "Copy", "Proof"].map(type => {
              const filtered = suggestions.filter(s => s.type === type && s.state === "pending");
              if (!filtered.length) return null;
              return (
                <div key={type} style={{ marginBottom: 15 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                    cursor: "pointer"
                  }}>
                    <span style={{
                      background: getSuggestionColor(type),
                      borderRadius: 7,
                      fontSize: 18,
                      padding: "2px 14px",
                      marginRight: 7
                    }}>{getSuggestionIcon(type)}</span>
                    <span>{type} ({filtered.length})</span>
                  </div>
                  <div>
                    {filtered.map((sug, idx) => (
                      <SuggestionCard
                        key={sug.id}
                        sug={sug}
                        idx={suggestions.findIndex(s => s.id === sug.id)}
                        activeIdx={activeIdx}
                        setActiveIdx={setActiveIdx}
                        applySuggestion={applySuggestion}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 18 }}>
              <b>Suggestions</b>
              <span style={{
                background: "#ede9fe", borderRadius: 6, color: "#a21caf", fontWeight: 700, marginLeft: 8, fontSize: 13, padding: "3px 12px"
              }}>
                Focus View
              </span>
            </div>
            {suggestions.filter(s => s.state === "pending").length ? (
              <SuggestionCard
                sug={suggestions.filter(s => s.state === "pending")[focusSuggestion]}
                idx={suggestions.findIndex(s => s.state === "pending" && s.id === suggestions.filter(s => s.state === "pending")[focusSuggestion]?.id)}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
                applySuggestion={applySuggestion}
                focusMode
                prev={() => setFocusSuggestion(f => Math.max(f - 1, 0))}
                next={() => setFocusSuggestion(f => Math.min(f + 1, suggestions.filter(s => s.state === "pending").length - 1))}
                total={suggestions.filter(s => s.state === "pending").length}
                current={focusSuggestion}
              />
            ) : (
              <div style={{ color: "#aaa", fontSize: 16 }}>No pending suggestions</div>
            )}
          </div>
        )}

        {/* Learning Log */}
        <div style={{ marginTop: 28 }}>
          <details style={{
            background: "#faf6ff",
            borderRadius: 9,
            padding: "13px 15px",
            color: "#8b5cf6",
            fontWeight: 600,
            fontSize: 17
          }}>
            <summary style={{ cursor: "pointer", outline: "none", fontSize: 17, fontWeight: 600 }}>🪄 Learning Log</summary>
            <div style={{ marginTop: 12, color: "#444", fontWeight: 400, fontSize: 15 }}>
              <ul style={{ marginLeft: 14 }}>
                {history.map((item, i) => (
                  <li key={i}>Undo: {i + 1} – {Object.values(item.suggestions).filter(s => s.state !== "pending").length} suggestion(s) acted on.</li>
                ))}
                {!history.length && <li>Try Accept/Reject/Revise a suggestion, then Undo here.</li>}
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// --- Suggestion Card UI (matches your style/screenshots)
function SuggestionCard({
  sug,
  idx,
  activeIdx,
  setActiveIdx,
  applySuggestion,
  focusMode,
  prev,
  next,
  total,
  current
}) {
  if (!sug) return null;
  return (
    <div
      onMouseEnter={() => setActiveIdx(idx)}
      onMouseLeave={() => setActiveIdx(null)}
      style={{
        background: "#fef3c7",
        border: "2px solid #fcd34d",
        borderRadius: 12,
        boxShadow: "0 2px 8px #f8fafc",
        marginBottom: 18,
        padding: 20,
        outline: activeIdx === idx ? "2.5px solid #a21caf" : "",
        transition: "outline .25s",
        position: "relative",
        fontSize: 17
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", marginBottom: 7
      }}>
        <span style={{
          background: getSuggestionColor(sug.type),
          borderRadius: 8,
          fontSize: 20,
          padding: "4px 14px",
          marginRight: 10
        }}>{getSuggestionIcon(sug.type)}</span>
        <span style={{ fontWeight: 700 }}>{sug.suggestion}</span>
      </div>
      <div style={{ color: "#059669", fontWeight: 600, marginBottom: 7 }}>
        Why: <span style={{ color: "#059669", fontWeight: 500 }}>{sug.why}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => window.alert("Deep Dive: (Placeholder for future AI chat/analysis)")}
          style={{
            background: "#e0e7ff", color: "#4338ca",
            fontWeight: 600, border: "none", borderRadius: 6, fontSize: 14, padding: "4px 14px", marginRight: 12, marginBottom: 6, cursor: "pointer"
          }}
        >+ Deep Dive</button>
        <button
          onClick={() => applySuggestion(idx, "accept")}
          style={{
            background: "#22c55e", color: "white", fontWeight: 600,
            border: "none", borderRadius: 6, fontSize: 14, padding: "4px 14px", marginRight: 8, cursor: "pointer"
          }}
        >Accept</button>
        <button
          onClick={() => applySuggestion(idx, "reject")}
          style={{
            background: "#ef4444", color: "white", fontWeight: 600,
            border: "none", borderRadius: 6, fontSize: 14, padding: "4px 14px", marginRight: 8, cursor: "pointer"
          }}
        >Reject</button>
        <button
          onClick={() => {
            const val = window.prompt("Enter your revision:", sug.suggestion);
            if (val != null && val.length > 0) applySuggestion(idx, "revise", val);
          }}
          style={{
            background: "#facc15", color: "#1e293b", fontWeight: 600,
            border: "none", borderRadius: 6, fontSize: 14, padding: "4px 14px", marginRight: 8, cursor: "pointer"
          }}
        >Revise</button>
      </div>
      {focusMode && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={prev} disabled={current === 0}
            style={{
              background: "#f1f5f9", color: "#aaa", fontWeight: 700,
              border: "none", borderRadius: 6, padding: "3px 18px", fontSize: 15, opacity: current === 0 ? 0.5 : 1, cursor: current === 0 ? "not-allowed" : "pointer"
            }}>Prev</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{current + 1} of {total}</span>
          <button onClick={next} disabled={current === total - 1}
            style={{
              background: "#f1f5f9", color: "#aaa", fontWeight: 700,
              border: "none", borderRadius: 6, padding: "3px 18px", fontSize: 15, opacity: current === total - 1 ? 0.5 : 1, cursor: current === total - 1 ? "not-allowed" : "pointer"
            }}>Next</button>
        </div>
      )}
    </div>
  );
}
