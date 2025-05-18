import { useEffect, useState } from 'react';
export default function Trainer() {
  const [imageUrl, setImageUrl] = useState(null);
  const [filename, setFilename] = useState('');
  const [gptText, setGptText] = useState('');
  const [userRevision, setUserRevision] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState('Revise');
  const [loading, setLoading] = useState(false);
  const [logMessage, setLogMessage] = useState('');
  const [fileOptions, setFileOptions] = useState([]);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    async function fetchUploads() {
      const res = await fetch('/api/list-uploaded-files');
      const data = await res.json();
      setFileOptions(data.files || []);
    }
    fetchUploads();
  }, []);
  const handleFileSelect = async (e) => {
    const selected = e.target.value;
    setFilename(selected);
    setImageUrl(`/uploads/${selected}`);
    setSubmitted(false);
    setLogMessage('');
    setReading(true);
    try {
      const res = await fetch('/api/vision-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selected })
      });
      const data = await res.json();
      setGptText(data.cleanedText);
      setUserRevision(data.cleanedText);
    } catch (err) {
      console.error('Failed to load cleaned text:', err);
      setGptText('[Error reading file]');
      setUserRevision('[Error reading file]');
    }
    setReading(false);
  };
  const handleSubmit = async () => {
    setLoading(true);
    setSubmitted(true);
    const res = await fetch('/api/log-trainer-revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        gptText,
        userRevision: mode === 'Accept' ? gptText : userRevision
      })
    });
    const data = await res.json();
    setLoading(false);
    setLogMessage(data.message || 'Saved.');
  };
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 bg-white shadow-lg rounded-lg p-6">
        <div>
          <h2 className="text-xl font-bold mb-2">📂 Select a Scan</h2>
          <select
            value={filename}
            onChange={handleFileSelect}
            className="mb-4 w-full p-2 border border-gray-300 rounded"
          >
            <option value="">-- Select a scan to review --</option>
            {fileOptions.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
          {imageUrl ? (
            <img src={imageUrl} alt="Selected Scan" className="w-full rounded shadow-md" />
          ) : (
            <div className="text-gray-500 italic">No scan selected yet.</div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">✍️ Lulu's Cleaned Text</h2>
          <div className="mb-4">
            <label className="mr-4 font-medium">Mode:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            >
              <option value="Revise">Revise Manually</option>
              <option value="Accept">Accept GPT As-Is</option>
            </select>
          </div>
          <textarea
            rows="20"
            value={userRevision}
            onChange={(e) => setUserRevision(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm font-mono text-sm"
            disabled={mode === 'Accept' || reading}
          />
          <button
            onClick={handleSubmit}
            disabled={submitted || loading || !filename}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {submitted ? '✅ Submitted' : loading ? 'Saving...' : 'Submit Revision'}
          </button>
          {submitted && (
            <div className="mt-4 text-green-700 font-semibold">
              🧠 Lulu has learned from your correction. Voice memory updated.<br />
              {logMessage && <span className="text-sm block mt-1">{logMessage}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}