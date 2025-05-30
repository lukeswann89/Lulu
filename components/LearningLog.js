export default function LearningLog({ history, onUndo }) {
  return (
    <div style={{
      marginTop: 28,
      background: "#faf6ff",
      borderRadius: 9,
      padding: "13px 15px",
      color: "#8b5cf6",
      fontWeight: 600,
      fontSize: 17
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>🪄 Learning Log</span>
        <button
          style={{
            background: "#d1d5db",
            color: "#312e81",
            padding: "4px 18px",
            borderRadius: 4,
            border: "none",
            fontWeight: 600,
            opacity: history.length ? 1 : 0.5,
            cursor: history.length ? "pointer" : "not-allowed"
          }}
          onClick={onUndo}
          disabled={!history.length}
        >Undo</button>
      </div>
      <div style={{ marginTop: 12, color: "#444", fontWeight: 400, fontSize: 15 }}>
        <ul style={{ marginLeft: 14 }}>
          {history.map((item, i) => (
            <li key={i}>Undo: {i + 1} – {Object.values(item.suggestions).filter(s => s.state !== "pending").length} suggestion(s) acted on.</li>
          ))}
          {!history.length && <li>Try Accept/Reject/Revise a suggestion, then Undo here.</li>}
        </ul>
      </div>
    </div>
  );
}
