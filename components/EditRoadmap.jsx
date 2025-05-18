// ✅ /components/EditRoadmap.jsx — fixed state tracking and apply handling

import { useState, useEffect } from 'react';

export default function EditRoadmap({ roadmap = [], onApply }) {
  const [checkedItems, setCheckedItems] = useState([]);

  useEffect(() => {
    setCheckedItems(new Array(roadmap.length).fill(false));
  }, [roadmap]);

  const toggleChecked = (index) => {
    const updated = [...checkedItems];
    updated[index] = !updated[index];
    setCheckedItems(updated);
  };

  const handleApply = () => {
    const selected = roadmap
      .filter((_, i) => checkedItems[i])
      .map(r => `• ${r.description || r.suggestion || r.why}`);
    if (selected.length > 0) {
      onApply(prev => `${prev}\n\nChanges to make:\n${selected.join('\n')}`);
    }
  };

  return (
    <div className="mt-4 bg-white p-4 border rounded shadow-sm">
      <h3 className="text-lg font-semibold mb-2">🗺️ Revision Roadmap Preview</h3>
      {roadmap.length === 0 ? (
        <p className="text-sm text-gray-500">No suggestions yet.</p>
      ) : (
        <ul className="space-y-2">
          {roadmap.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={checkedItems[i] || false}
                onChange={() => toggleChecked(i)}
              />
              <div className="text-sm">
                <strong>{i + 1}.</strong> {item.description || item.suggestion || item.why}
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        className="mt-3 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded"
        onClick={handleApply}
      >
        Apply Selected Notes to Text
      </button>
    </div>
  );
}
