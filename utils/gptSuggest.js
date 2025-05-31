// utils/gptSuggest.js
export async function getSpecificEdits({ manuscript, editTypes, model }) {
  const res = await fetch('/api/specific-edits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: manuscript, editTypes, model }),
  });
  if (!res.ok) throw new Error('Failed to fetch edits');
  return await res.json();
}
