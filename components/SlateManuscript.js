import React, { useMemo, useCallback } from "react";
import { createEditor, Text } from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { withHistory } from "slate-history";
import { defaultValue as editorDefaultValue } from "./editorData";

// Hard fallback (never fails)
const fallbackParagraph = [{ type: "paragraph", children: [{ text: "" }] }];

function getSafeValue(val, defVal = editorDefaultValue) {
  if (Array.isArray(val) && val.length > 0 && val[0]?.type && val[0]?.children) return val;
  if (Array.isArray(defVal) && defVal.length > 0 && defVal[0]?.type && defVal[0]?.children) return defVal;
  return fallbackParagraph;
}

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
  const isActive = editor.marks(editor)?.[format];
  if (isActive) editor.removeMark(editor, format);
  else editor.addMark(editor, format, true);
};

const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  return (
    <button
      onMouseDown={event => {
        event.preventDefault();
        editor.setNodes(
          { type: format },
          { match: n => n.type === format }
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

export default function SlateManuscript({
  value,
  setValue,
  suggestions,
  activeIdx,
  setActiveIdx
}) {
  // SSR guard (Next.js) — only render in browser
  if (typeof window === "undefined") return null;

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const showNumbers = true;

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

  const safeValue = getSafeValue(value);

  // You can also add: console.log("SlateManuscript safeValue:", safeValue);

  return (
    <div style={{
      flex: 1.2,
      background: "#fff",
      borderRadius: 18,
      boxShadow: "0 2px 8px #e0e7ef",
      padding: 28
    }}>
      <h2 style={{ fontWeight: 800, color: "#6d28d9", fontSize: 26, marginBottom: 16 }}>Manuscript</h2>
      <Slate
        editor={editor}
        value={safeValue}
        onChange={v => setValue(getSafeValue(v))}
      >
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <ToolbarButton format="bold" icon={<b>B</b>} onClick={toggleMark} />
          <ToolbarButton format="italic" icon={<i>I</i>} onClick={toggleMark} />
          <BlockButton format="bulleted-list" icon="• Bulleted List" />
          <BlockButton format="numbered-list" icon="1. Numbered List" />
          <BlockButton format="heading-one" icon="H1" />
          <BlockButton format="heading-three" icon="H3" />
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
    </div>
  );
}
