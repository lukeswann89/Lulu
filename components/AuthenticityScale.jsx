import React from "react";

export default function AuthenticityScale({ percent }) {
  return (
    <div style={{
      background: "#f3f4f6", borderRadius: 9, padding: 12,
      marginBottom: 18, border: "2px solid #a78bfa", maxWidth: 260
    }}>
      <div style={{
        fontWeight: 700, fontSize: 17, color: "#a21caf", marginBottom: 7
      }}>Authenticity Scale</div>
      <div style={{
        fontSize: 25, fontWeight: 800, color: percent > 75 ? "#22c55e" : percent > 50 ? "#eab308" : "#ef4444"
      }}>
        {percent}%
      </div>
      <div style={{ color: "#64748b", fontSize: 14 }}>
        Proportion of the manuscript still <b>authentically yours</b>.
      </div>
    </div>
  );
}
