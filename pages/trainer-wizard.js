import { useState } from 'react';
export default function TrainerWizard() {
  const [file, setFile] = useState(null);
  const [imageURL, setImageURL] = useState('');
  const [guesses, setGuesses] = useState(null);
  const [manualEdits, setManualEdits] = useState({});
  const [croppedImages, setCroppedImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload-full-sheet', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.guesses) {
        setImageURL(URL.createObjectURL(file));
        setGuesses(data.guesses);
        setStatus('Processed! Review below.');
        // Crop each letter box
        const cropRes = await fetch('/api/crop-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, rows: 5, cols: 6 })
        });
        const cropData = await cropRes.json();
        if (cropData.success) {
          setCroppedImages(cropData.images);
        }
      } else {
        setStatus('⚠️ Lulu could not read the scan. Please try again or crop the image.');
        setGuesses(null);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setStatus('❌ Upload failed. Please try again.');
    }
  };
  const handleEdit = (letter, value) => {
    setManualEdits(prev => ({ ...prev, [letter]: value }));
  };
  const handleSubmit = async () => {
    if (!guesses) return;
    setSubmitting(true);
    setStatus('Submitting confirmed letters...');
    const res = await fetch('/api/confirm-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guesses: Object.fromEntries(
          Object.entries(guesses).map(([key, val]) => [key, manualEdits[key]?.trim() || val])
        ),
        style: 'messy' // Can be changed to 'neat', 'uppercase', etc. later
      })
    });
    const result = await res.json();
    setSubmitting(false);
    setStatus(result.success ? '✅ Saved!' : '❌ Failed to save.');
  };
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">🧪 Lulu Trainer Wizard</h1>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} className="ml-4 bg-blue-600 text-white px-4 py-2 rounded">
          Upload & Analyze
        </button>
        <p className="mt-2 text-sm text-gray-700">{status}</p>
      </div>
      {imageURL && guesses && (
        <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-lg font-semibold mb-2">Scan Preview</h2>
            <img src={imageURL} alt="Uploaded Scan" className="w-full border rounded" />
          </div>
          <div className="bg-white p-4 shadow rounded">
            <h2 className="text-lg font-semibold mb-2">Lulu's Cleaned Output</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(guesses || {}).map(([key, val], idx) => {
                const croppedImageUrl = croppedImages?.[idx];
                return (
                  <div key={key} className="flex items-center gap-3">
                    {croppedImageUrl && (
                      <img
                        src={croppedImageUrl}
                        alt={`Letter ${key}`}
                        className="w-12 h-12 object-contain border rounded"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-mono">{key}:</span>
                      <input
                        type="text"
                        maxLength={1}
                        defaultValue={val}
                        onChange={(e) => handleEdit(key, e.target.value)}
                        className="border p-1 rounded w-12 text-center"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
            >
              ✅ Confirm & Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}