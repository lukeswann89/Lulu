// Returns an array of string chunks of the input text, suitable for OpenAI API calls.
// Default chunk size is 3000 characters (can be increased if needed).
export function chunkText(text, maxLen = 3000) {
  if (!text || text.length <= maxLen) return [text];

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    // Try to break at the nearest paragraph or sentence ending
    let end = start + maxLen;
    if (end < text.length) {
      let lastPeriod = text.lastIndexOf('.', end);
      let lastNewline = text.lastIndexOf('\n', end);
      // Prefer paragraph, then period, else hard split
      if (lastNewline > start + maxLen / 2) end = lastNewline + 1;
      else if (lastPeriod > start + maxLen / 2) end = lastPeriod + 1;
    } else {
      end = text.length;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}
