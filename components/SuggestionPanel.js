import SuggestionCard from "./SuggestionCard";

export default function SuggestionPanel({ suggestions, activeIdx, setActiveIdx, applySuggestion }) {
  if (!suggestions.length) return <div>No suggestions found.</div>;
  return (
    <div style={{
      background: "#fafcff",
      borderRadius: 18,
      boxShadow: "0 2px 8px #e0e7ef",
      padding: 26
    }}>
      <h2 style={{
        fontWeight: 700,
        color: "#2563eb",
        fontSize: 20,
        marginBottom: 16
      }}>Suggestions</h2>
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
                background: "#eee",
                borderRadius: 7,
                fontSize: 18,
                padding: "2px 14px",
                marginRight: 7
              }}>{type}</span>
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
  );
}
