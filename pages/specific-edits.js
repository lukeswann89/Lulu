// pages/specific-edits.js
import { useState } from "react";
import ManuscriptEditor from "../components/ManuscriptEditor";
import SpecificEditsPanel from "../components/SpecificEditsPanel";

const EDIT_TYPES = ["Developmental", "Structural", "Line", "Copy", "Proofreading"];

export default function SpecificEditsPage() {
  const [manuscript, setManuscript] = useState("");
  const [editTypes, setEditTypes] = useState([...EDIT_TYPES]);
  const [cascade, setCascade] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [activeType, setActiveType] = useState(EDIT_TYPES[0]);
  const [activeIdx, setActiveIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleType(type) {
    setEditTypes(editTypes =>
      editTypes.includes(type)
        ? editTypes.filter(t => t !== type)
        : [...editTypes, type]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setSuggestions({});
    setActiveType(EDIT_TYPES[0]);
    setActiveIdx(null);
    try {
      const res = await fetch("/api/specific-edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: manuscript, editTypes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setSuggestions(data.suggestions || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Accept/Reject/Revise can be added here as you extend the UX:
  function handleAccept(idx) {
    setSuggestions(sugs => {
      const arr = [...(sugs[activeType] || [])];
      arr[idx].state = "accepted";
      return { ...sugs, [activeType]: arr };
    });
  }
  function handleReject(idx) {
    setSuggestions(sugs => {
      const arr = [...(sugs[activeType] || [])];
      arr[idx].state = "rejected";
      return { ...sugs, [activeType]: arr };
    });
  }
  function handleRevise(idx) {
    const newVal = prompt("Your revision:", suggestions[activeType][idx].suggestion);
    if (!newVal) return;
    setSuggestions(sugs => {
      const arr = [...(sugs[activeType] || [])];
      arr[idx].state = "revised";
      arr[idx].suggestion = newVal;
      return { ...sugs, [activeType]: arr };
    });
  }

  function getEditMeta(type) {
    // Add icons/colors if you want
    return { icon: "✏️", iconColor: "text-blue-500" };
  }

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto", padding: 24, background: "#f8fafc", borderRadius: 16 }}>
      <h1 style={{ fontSize: 32, color: "#9333ea", fontWeight: 800, marginBottom: 18 }}>Lulu Specific Edits</h1>
      <ManuscriptEditor
        initialText={manuscript}
        initialSuggestions={[]} // (for this mode, just for stats panel)
      />
      <textarea
        value={manuscript}
        onChange={e => setManuscript(e.target.value)}
        placeholder="Paste or type your manuscript here..."
        rows={8}
        style={{ width: "100%", fontSize: 17, margin: "18px 0", borderRadius: 8, border: "1.5px solid #a78bfa", padding: 8 }}
      />

      {/* Edit Level Selection */}
      <div style={{ margin: "18px 0" }}>
        <b>Edit Levels:</b>
        {EDIT_TYPES.map(type => (
          <label key={type} style={{ marginLeft: 14, fontSize: 16 }}>
            <input
              type="checkbox"
              checked={editTypes.includes(type)}
              onChange={() => toggleType(type)}
              style={{ marginRight: 4 }}
            />
            {type}
          </label>
        ))}
        <label style={{ marginLeft: 18 }}>
          <input
            type="checkbox"
            checked={cascade}
            onChange={e => setCascade(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          Cascade Mode
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: "#9333ea",
          color: "#fff",
          border: "none",
          padding: "9px 26px",
          borderRadius: 9,
          fontWeight: 700,
          fontSize: 18,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Thinking..." : "Submit to Lulu"}
      </button>

      {error && <div style={{ color: "#e11d48", margin: "12px 0" }}>{error}</div>}

      {/* Edit Type Tabs */}
      <div style={{ marginTop: 28, marginBottom: 10, display: "flex", gap: 16 }}>
        {EDIT_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              fontWeight: 600,
              padding: "6px 18px",
              borderRadius: 8,
              background: activeType === type ? "#a78bfa" : "#e0e7ff",
              color: activeType === type ? "#fff" : "#374151",
              border: "none",
              outline: activeType === type ? "2.5px solid #9333ea" : "none"
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Suggestions Panel */}
      <SpecificEditsPanel
        suggestions={suggestions[activeType] || []}
        activeIdx={activeIdx}
        onFocus={setActiveIdx}
        onAccept={handleAccept}
        onReject={handleReject}
        onRevise={handleRevise}
        getEditMeta={getEditMeta}
      />
    </div>
  );
}
