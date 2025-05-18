// ✅ /components/GeneralEditsPanel.jsx — patched to fix Apply + checkbox behaviour

import { useState } from 'react';

export default function GeneralEditsPanel({ groupedSuggestions = {}, onApply }) {
  const priorities = {
    High: 'text-red-600',
    Medium: 'text-yellow-600',
    Low: 'text-gray-500'
  };

  const [selected, setSelected] = useState({});

  const toggle = (key) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applySelected = () => {
    const itemsToApply = Object.entries(selected)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key.split('::'))
      .map(([type, i]) => groupedSuggestions[type][parseInt(i)])
      .map(item => `• ${item.recommendation}`);

    onApply && onApply(prev => `${prev}

Changes to make:
${itemsToApply.join('\n')}`);
  };

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">📘 General Editorial Feedback</h2>
      {Object.entries(groupedSuggestions).map(([category, items]) => (
        <div key={category} className="mb-6">
          <h3 className="text-lg font-bold mb-2 border-b pb-1">{category}</h3>
          {items.length > 0 ? (
            items.map((item, index) => {
              const id = `${category}::${index}`;
              return (
                <div key={id} className="mb-4 p-3 border rounded">
                  <label className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={!!selected[id]}
                      onChange={() => toggle(id)}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${priorities[item.priority] || 'text-gray-800'}`}>
                        {item.priority && `🔹 ${item.priority}`} — {item.recommendation}
                      </p>
                      <p className="text-sm italic text-gray-600 mb-1">Why: {item.why}</p>
                      {item.principles?.length > 0 && (
                        <p className="text-sm text-blue-700">Principles: {item.principles.join(', ')}</p>
                      )}
                    </div>
                  </label>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 italic">No suggestions in this category.</p>
          )}
        </div>
      ))}
      <button
        onClick={applySelected}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm"
      >
        ✅ Apply Selected Notes to Text
      </button>
    </div>
  );
}
