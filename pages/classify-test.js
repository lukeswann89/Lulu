import { useState } from 'react';

export default function ClassifyTest() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseType, setCaseType] = useState('lower');

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('case', caseType);

    const res = await fetch('/api/classify-letter', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    setResult(data.guess || 'No guess returned');
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>🔤 Classify a Handwritten Letter</h1>
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      <select value={caseType} onChange={(e) => setCaseType(e.target.value)} style={{ marginLeft: '1rem' }}>
        <option value="lower">Lowercase</option>
        <option value="upper">Uppercase</option>
      </select>
      <button onClick={handleUpload} disabled={!file} style={{ marginLeft: '1rem' }}>
        Submit
      </button>
      {loading && <p>🌀 Classifying...</p>}
      {result && !loading && <h2>✅ GPT-4o says: <code>{result}</code></h2>}
    </div>
  );
}
