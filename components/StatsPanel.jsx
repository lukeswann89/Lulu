import React from "react";

// Utility: reading time (200wpm default)
function readingTime(text, wpm = 200) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / wpm));
}

// Authenticity calculation (simple version: % unchanged vs original)
function calculateAuthenticity({ originalText, currentText, suggestions }) {
  // This can get very sophisticated! For now, simple Levenshtein ratio:
  function levenshtein(a, b) {
    if (a === b) return 0;
    const matrix = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i][j - 1] + 1, // insert
          matrix[i - 1][j] + 1, // delete
          matrix[i - 1][j - 1] + indicator // substitute
        );
      }
    }
    return matrix[a.length][b.length];
  }

  // Score: 1 - (distance/length)
  const lev = levenshtein(originalText, currentText);
  const auth = 1 - Math.min(1, lev / Math.max(originalText.length, 1));
  return Math.round(auth * 100);
}

export default function StatsPanel({ originalText, currentText, suggestions }) {
  const wordCount = currentText.trim().split(/\s+/).length;
  const minutes = readingTime(currentText);
  const authenticity = calculateAuthenticity({ originalText, currentText, suggestions });

  return (
    <div style={{
      background: "#eef2ff", borderRadius: 8, padding: 14, margin: "18px 0", display: "flex", gap: 30,
      alignItems: "center", fontWeight: 500
    }}>
      <span>Word Count: <b>{wordCount}</b></span>
      <span>Reading Time: <b>{minutes} min</b></span>
      <span style={{ color: authenticity > 90 ? "#22c55e" : authenticity > 70 ? "#facc15" : "#ef4444" }}>
        Authenticity: <b>{authenticity}%</b>
      </span>
    </div>
  );
}
