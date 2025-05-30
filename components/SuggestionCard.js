export default function SuggestionCard({
  sug,
  idx,
  activeIdx,
  setActiveIdx,
  applySuggestion
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
          background: "#ffe29b",
          borderRadius: 8,
          fontSize: 20,
          padding: "4px 14px",
          marginRight: 10
        }}>{sug.icon || "💡"}</span>
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
    </div>
  );
}
