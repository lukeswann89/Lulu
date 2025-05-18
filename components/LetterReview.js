import { useState } from 'react';
export default function LetterReview({ letter, style, onClose, onConfirm }) {
  const [file, setFile] = useState(null);
  const [gptGuess, setGptGuess] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [manualCorrection, setManualCorrection] = useState('');
  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-letter', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    setGptGuess(data.guess);
  };
  const handleConfirm = () => {
    const finalGuess = manualCorrection.trim() || gptGuess;
    if (!finalGuess) return;
    setConfirmed(true);
    onConfirm(letter, style, finalGuess);
  };
  return (
    <div className="mt-8 max-w-2xl mx-auto bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        Reviewing: {letter} ({style})
      </h2>
      <div className="mb-4">
        <label className="block font-medium mb-1">Upload a scan of the letter:</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button
          onClick={handleUpload}
          disabled={!file}
          className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
        >
          Upload & Analyse
        </button>
      </div>
      {gptGuess && (
        <div className="mb-4">
          <p><strong>GPT’s Guess:</strong> <code>{gptGuess}</code></p>
          <label className="block font-medium mt-2 mb-1">Correct it if needed:</label>
          <input
            type="text"
            maxLength={1}
            value={manualCorrection}
            onChange={(e) => setManualCorrection(e.target.value)}
            className="border px-2 py-1 rounded w-16 text-center"
          />
        </div>
      )}
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleConfirm}
          disabled={!gptGuess && !manualCorrection}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Confirm
        </button>
        <button
          onClick={onClose}
          className="bg-gray-300 text-black px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
      {confirmed && (
        <p className="mt-4 text-green-700 font-medium">
          ✅ Confirmed as "{manualCorrection || gptGuess}" and saved.
        </p>
      )}
    </div>
  );
}