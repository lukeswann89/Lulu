// utils/authenticityUtils.js

// Calculates % of original text that remains after all accepted/revised suggestions
export function calculateAuthenticity({ originalText, currentText, suggestions }) {
  const totalChars = originalText.length;

  // Get all accepted/revised suggestions and their impact
  let changedChars = 0;

  suggestions.forEach(sug => {
    if (sug.state === "accepted") {
      changedChars += sug.original.length;
    } else if (sug.state === "revised" && sug.suggestion) {
      // Credit user for new words: subtract overlap with Lulu's suggestion
      const overlap = stringOverlap(sug.original, sug.suggestion);
      changedChars += sug.original.length - overlap;
    }
    // Rejected/ignored have no impact
  });

  let remaining = Math.max(totalChars - changedChars, 0);
  return Math.round((remaining / totalChars) * 100);
}

// Simple overlap: counts same characters (case-sensitive)
function stringOverlap(a, b) {
  // More advanced: Levenshtein distance or use a diff library
  let minLen = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) same++;
  }
  return same;
}
