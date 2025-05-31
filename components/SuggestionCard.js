export default function SuggestionCard({
  sug,
  idx,
  onAccept,
  onReject,
  onRevise,
  onUndo,
  activeIdx,
  setActiveIdx
}) {
  if (!sug) return null;
  return (
    <div
      onMouseEnter={() => setActiveIdx?.(idx)}
      onMouseLeave={() => setActiveIdx?.(null)}
      style={{
        background: sug.color || "#fef3c7",
        border: "2px solid #fcd34d",
        borderRadius: 12,
        marginBottom: 18,
        padding: 20,
        outline: activeIdx === idx ? "2.5px solid #a21caf" : "",
        fontSize: 17,
        opacity: sug.alignError ? 0.7 : 1,
        position: "relative"
      }}
    >
      <div style={{
        position: "absolute",
        top: 10,
        right: 18,
        fontSize: 16,
        background: "#fde68a",
        borderRadius: 7,
        padding: "0 7px",
        fontWeight: 700
      }}>#{idx + 1}</div>

      <div><b>Original:</b> <span style={{ color: "#991b1b" }}>{sug.original}</span></div>
      <div><b>Suggestion:</b> <span style={{ color: "#2563eb" }}>{sug.suggestion}</span></div>
      <div><b>Why:</b> <span style={{ color: "#059669" }}>{sug.why}</span></div>
      {sug.alignError && (
        <div style={{ color: "#dc2626", marginTop: 4 }}>
          {sug.errorMessage || "Cannot find original text in current document"}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: '10px' }}>
        {sug.state === "pending" ? (
          <>
            <button
              onClick={() => onAccept(sug.id)}
              disabled={sug.alignError}
              style={{
                background: sug.alignError ? "#d1d5db" : "#22c55e",
                color: "white",
                padding: "4px 14px",
                borderRadius: 6,
                fontWeight: 600,
                border: 'none'
              }}
            >Accept</button>
            <button
              onClick={() => onReject(sug.id)}
              style={{
                background: "#ef4444",
                color: "white",
                padding: "4px 14px",
                borderRadius: 6,
                fontWeight: 600,
                border: 'none'
              }}
            >Reject</button>
            <button
              onClick={() => {
                const val = window.prompt("Enter your revision:", sug.suggestion);
                if (val) onRevise(sug.id, val);
              }}
              disabled={sug.alignError}
              style={{
                background: sug.alignError ? "#d1d5db" : "#facc15",
                color: "#1e293b",
                padding: "4px 14px",
                borderRadius: 6,
                fontWeight: 600,
                border: 'none'
              }}
            >Revise</button>
          </>
        ) : (
          <button
            onClick={() => onUndo(sug.id)}
            style={{
              background: "#a78bfa",
              color: "white",
              padding: "4px 14px",
              borderRadius: 6,
              fontWeight: 600,
              border: 'none'
            }}
          >Undo</button>
        )}
      </div>
    </div>
  );
}
