export default function SuggestionPanel({ suggestions }) {
  if (!suggestions.length) return null;
  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="text-2xl font-semibold mb-2">Lulu's Suggestions</h2>
      {suggestions.map((sug, index) => (
        <div key={index} className="border-t py-2">
          <p><strong>Original:</strong> {sug.original}</p>
          <p><strong>Suggestion:</strong> {sug.suggestion}</p>
          <p><strong>Why:</strong> {sug.why}</p>
          <div className="flex gap-2 mt-2">
            <button className="bg-green-500 text-white px-2 py-1 rounded">Accept</button>
            <button className="bg-red-500 text-white px-2 py-1 rounded">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
