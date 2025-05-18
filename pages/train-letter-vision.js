import { useState } from 'react';

export default function TrainLetterVisionPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [caseType, setCaseType] = useState('lower');
  const [results, setResults] = useState([]);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('🧠 Classifying via GPT-4o Vision...');
    setMessage('');
    setResults([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('case', caseType);

    try {
      const res = await fetch('/api/train-letter-vision', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('✅ Success');
        setMessage(data.message);
        setResults(data.letters || []);
      } else {
        setStatus('❌ Failed');
        setMessage(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('❌ Error');
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: 'auto' }}>
      <h1>🧪 Upload A–Z Calibration Grid</h1>
      <p>
        Upload a PDF or image of your handwritten grid. Lulu will crop and store the letters.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Case:{' '}
          <select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            <option value="lower">Lowercase</option>
            <option value="upper">Uppercase</option>
          </select>
        </label>
      </div>

      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        onClick={handleUpload}
        disabled={!file}
        style={{
          marginLeft: '1rem',
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: file ? 'pointer' : 'not-allowed',
        }}
      >
        Submit Grid
      </button>

      <div style={{ marginTop: '1rem' }}>
        <strong>{status}</strong>
        <p>{message}</p>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>🔤 Extracted Letters</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
            {results.map((r) => (
              <div key={r.imagePath} style={{ textAlign: 'center' }}>
                <img
                  src={r.imagePath}
                  alt={r.label}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
