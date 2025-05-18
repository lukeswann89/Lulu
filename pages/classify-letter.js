import { useState } from 'react';

export default function ClassifyLetterPage() {
  const [file, setFile] = useState(null);
  const [caseType, setCaseType] = useState('lower');
  const [status, setStatus] = useState('');
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('🔍 Classifying...');
    setGuess('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('case', caseType);

    try {
      const res = await fetch('/api/classify-letter', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('✅ Done!');
        setGuess(data.guess || 'Unknown');
      } else {
        setStatus('❌ Failed');
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('❌ Error');
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>🔤 Classify Handwritten Letter</h1>
      <p>Upload a single handwritten letter image. Lulu will try to identify which letter it is.</p>

      <label>
        Case:{' '}
        <select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
          <option value="lower">Lowercase</option>
          <option value="upper">Uppercase</option>
        </select>
      </label>

      <br />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginTop: '0.5rem' }}
      />
      <button
        onClick={handleUpload}
        disabled={!file}
        style={{
          marginLeft: '1rem',
          padding: '10px 20px',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Submit
      </button>

      <div style={{ marginTop: '1rem' }}>
        <strong>{status}</strong>
        {error && <p style={{ color: 'red' }}>❌ {error}</p>}
        {guess && (
          <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
            🧠 Lulu thinks this is: <strong>{guess.toUpperCase()}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
