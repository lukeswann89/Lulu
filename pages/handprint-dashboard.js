import { useState, useEffect } from 'react';
import LetterReview from '../components/LetterReview';

const allLetters = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'];

export default function HandprintDashboard() {
  const [progress, setProgress] = useState({});
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);

  useEffect(() => {
    async function loadProgress() {
      const res = await fetch('/api/handprint-progress');
      const data = await res.json();
      setProgress(data);
    }
    loadProgress();
  }, []);

  const statusIcon = (data) => {
    if (!data) return '❌';
    if (data.confirmed) return '✅';
    const learned = Object.values(data.sources).reduce((a, b) => a + b, 0);
    return learned > 0 ? '🔄' : '❌';
  };

  const handleTileClick = (letter, style) => {
    setSelectedLetter(letter);
    setSelectedStyle(style);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-6">✍️ Lulu Handprint Dashboard</h1>
      <div className="grid grid-cols-6 gap-4 max-w-5xl mx-auto">
        {allLetters.map(letter => (
          <div key={letter} className="bg-white p-3 rounded shadow text-center">
            <div className="text-xl font-semibold mb-2">{letter}</div>
            <div className="flex justify-around">
              <button onClick={() => handleTileClick(letter, 'neat')} className="px-2 py-1 rounded border text-sm">Neat {statusIcon(progress[letter]?.neat)}</button>
              <button onClick={() => handleTileClick(letter, 'messy')} className="px-2 py-1 rounded border text-sm">Messy {statusIcon(progress[letter]?.messy)}</button>
            </div>
          </div>
        ))}
      </div>

      {selectedLetter && selectedStyle && (
        <LetterReview
          letter={selectedLetter}
          style={selectedStyle}
          onClose={() => { setSelectedLetter(null); setSelectedStyle(null); }}
          onConfirm={async (letter, style, guess) => {
            const res = await fetch('/api/confirm-letter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ letter, style, guess })
            });
            if (res.ok) {
              const data = await res.json();
              setProgress(prev => ({
                ...prev,
                [letter]: {
                  ...prev[letter],
                  [style]: {
                    ...prev[letter]?.[style],
                    ...data.updated[style]
                  }
                }
              }));
            } else {
              console.error('Failed to confirm letter:', await res.text());
            }
          }}
        />
      )}
    </div>
  );
}
