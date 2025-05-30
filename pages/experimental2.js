import React, { useState } from "react";
import SlateManuscript from "../components/SlateManuscript";
import SuggestionPanel from "../components/SuggestionPanel";
import LearningLog from "../components/LearningLog";
import { defaultValue as editorDefaultValue, initialSuggestions } from "../components/editorData";

// Always provide a bulletproof fallback
const fallbackParagraph = [{ type: "paragraph", children: [{ text: "" }] }];

function getSafeValue(val) {
  if (Array.isArray(val) && val.length > 0 && val[0]?.type && val[0]?.children) return val;
  if (Array.isArray(editorDefaultValue) && editorDefaultValue.length > 0 && editorDefaultValue[0]?.type && editorDefaultValue[0]?.children) return editorDefaultValue;
  return fallbackParagraph;
}

export default function ExperimentalEditor() {
  // Defensive state init
  const [value, setValue] = useState(getSafeValue(editorDefaultValue));
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [activeIdx, setActiveIdx] = useState(null);
  const [history, setHistory] = useState([]);

  const applySuggestion = (idx, action, customText) => {
    const sug = suggestions[idx];
    if (!sug || sug.state !== "pending") return;
    setHistory(h => [...h, { value: JSON.parse(JSON.stringify(value)), suggestions: JSON.parse(JSON.stringify(suggestions)) }]);
    let newValue = [...value];
    if (action === "accept" || action === "revise") {
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
    setValue(getSafeValue(newValue));
    setSuggestions(newSugs);
    setActiveIdx(null);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setValue(getSafeValue(prev.value));
    setSuggestions(prev.suggestions);
    setHistory(h => h.slice(0, -1));
    setActiveIdx(null);
  };

  return (
    <div className="flex gap-10 max-w-7xl mx-auto mt-10">
      <SlateManuscript
        value={getSafeValue(value)}
        setValue={val => setValue(getSafeValue(val))}
        suggestions={suggestions}
        activeIdx={activeIdx}
        setActiveIdx={setActiveIdx}
      />
      <div className="flex flex-col gap-4 w-[30rem]">
        <SuggestionPanel
          suggestions={suggestions}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          applySuggestion={applySuggestion}
        />
        <LearningLog history={history} onUndo={handleUndo} />
      </div>
    </div>
  );
}
