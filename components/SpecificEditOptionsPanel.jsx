import React from "react";

const EDIT_TYPES = ["Developmental", "Structural", "Line", "Copy", "Proofreading"];

export default function SpecificEditOptionsPanel({
  editTypes,
  setEditTypes,
  cascadeMode,
  setCascadeMode,
  onSubmit,
  loading
}) {
  function toggleType(type) {
    if (editTypes.includes(type)) {
      setEditTypes(editTypes.filter(t => t !== type));
    } else {
      setEditTypes([...editTypes, type]);
    }
  }
  return (
    <div style={{ border: "1.5px solid #e0e7ff", borderRadius: 12, padding: 18, marginBottom: 30 }}>
      <h3 style={{ fontWeight: 700, color: "#3b82f6" }}>Edit Levels</h3>
      <div style={{ marginBottom: 12 }}>
        {EDIT_TYPES.map(type => (
          <label key={type} style={{ display: "block", fontSize: 17, marginBottom: 5 }}>
            <input
              type="checkbox"
              checked={editTypes.includes(type)}
              onChange={() => toggleType(type)}
              style={{ marginRight: 8 }}
            />
            {type}
          </label>
        ))}
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, fontSize: 16 }}>
          <input
            type="checkbox"
            checked={cascadeMode}
            onChange={e => setCascadeMode(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Cascade Mode <span style={{ fontSize: 13, color: "#888" }}>(stepwise, top-down)</span>
        </label>
      </div>
      <button
        onClick={onSubmit}
        disabled={loading}
        style={{
          background: "#9333ea",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 22px",
          fontWeight: 700,
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Thinking..." : "Submit to Lulu"}
      </button>
    </div>
  );
}
