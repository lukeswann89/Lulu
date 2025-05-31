import React from "react";
import SuggestionCard from "./SuggestionCard";

export default function SuggestionList({ suggestions, onAccept, onReject, onRevise, onUndo }) {
  return (
    <div>
      {suggestions.map((sug, idx) => (
        <SuggestionCard
          key={sug.id}
          sug={sug}
          idx={idx}
          onAccept={() => onAccept(sug.id)}
          onReject={() => onReject(sug.id)}
          onRevise={(idx, val) => onRevise(sug.id, val)}
          onUndo={() => onUndo(sug.id)}
          activeIdx={null}
          setActiveIdx={() => {}}
        />
      ))}
    </div>
  );
}
