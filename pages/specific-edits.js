// pages/specific-edits.js
import { useState, useMemo, useRef } from "react";
import { apiClient } from "../utils/apiClient";
import EditingWorkspace from "../containers/EditingWorkspace";
import SpecificEditsPanel from "../components/SpecificEditsPanel";

const EDIT_TYPES = ["Developmental", "Structural", "Line", "Copy", "Proofreading"];

export default function SpecificEditsPage() {
  const [manuscript, setManuscript] = useState("This is a sample text for testing. It has some issues we can fix.");
  const [editTypes, setEditTypes] = useState([...EDIT_TYPES]);
  const [cascade, setCascade] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [activeType, setActiveType] = useState(EDIT_TYPES[0]);
  const [activeIdx, setActiveIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const proseMirrorRef = useRef(null);

  const flattenedSuggestions = useMemo(() => {
    return Object.values(suggestions).flat();
  }, [suggestions]);

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
      const { data, meta } = await apiClient.post("/api/specific-edits", { text: manuscript, editTypes, cascade });
      
      // Optional: observability
      console.debug('[SpecificEdits] meta', meta);
      
      const suggestionsWithIds = {};
      Object.keys(data?.suggestions || {}).forEach(key => {
        suggestionsWithIds[key] = data.suggestions[key].map((s, i) => ({
          ...s,
          id: `${key}_${i}_${Date.now()}`
        }));
      });
      setSuggestions(suggestionsWithIds);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAccept(id) {
    setSuggestions(sugs => {
      const newSugs = { ...sugs };
      for (const type in newSugs) {
        const index = newSugs[type].findIndex(s => s.id === id);
        if (index !== -1) {
          const newArr = [...newSugs[type]];
          newArr[index] = { ...newArr[index], state: "accepted" };
          newSugs[type] = newArr;
          break;
        }
      }
      return newSugs;
    });
  }

  function handleReject(id) {
    setSuggestions(sugs => {
      const newSugs = { ...sugs };
      for (const type in newSugs) {
        const index = newSugs[type].findIndex(s => s.id === id);
        if (index !== -1) {
          const newArr = [...newSugs[type]];
          newArr[index] = { ...newArr[index], state: "rejected" };
          newSugs[type] = newArr;
          break;
        }
      }
      return newSugs;
    });
  }
  
  function handleRevise(id) {
    const suggestion = flattenedSuggestions.find(s => s.id === id);
    if (!suggestion) return;

    const newVal = prompt("Your revision:", suggestion.suggestion);
    if (newVal === null) return;

    setSuggestions(sugs => {
      const newSugs = { ...sugs };
      for (const type in newSugs) {
        const index = newSugs[type].findIndex(s => s.id === id);
        if (index !== -1) {
          const newArr = [...newSugs[type]];
          newArr[index] = { ...newArr[index], state: "revised", suggestion: newVal };
          newSugs[type] = newArr;
          break;
        }
      }
      return newSugs;
    });
  }

  function getEditMeta(type) {
    return { icon: "✏️", iconColor: "text-blue-500" };
  }

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: 24, background: "#f8fafc", borderRadius: 16 }}>
      <h1 style={{ fontSize: 32, color: "#9333ea", fontWeight: 800, marginBottom: 18 }}>Lulu Specific Edits</h1>
      
      <div className="flex gap-6">
        <div className="w-2/3">
          <EditingWorkspace
            proseMirrorRef={proseMirrorRef}
            text={manuscript}
            setText={setManuscript}
            specificEdits={flattenedSuggestions}
            onAcceptSpecific={handleAccept}
            onRejectSpecific={handleReject}
            onReviseSpecific={handleRevise}
            mode="Specific Edits"
            debug={true}
          />
        </div>

        <div className="w-1/3">
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
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%"
            }}
          >
            {loading ? "Thinking..." : "Submit to Lulu"}
          </button>

          {error && <div style={{ color: "#e11d48", margin: "12px 0" }}>{error}</div>}

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
      </div>
    </div>
  );
}
