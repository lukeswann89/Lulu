import { useState } from 'react';

export default function TrainLetterPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [letters, setLetters] = useState([]);
  const [letterCase, setLetterCase] = useState('lower');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading...');
    setLetters([]);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('case', letterCase);

    try {
      const res = await fetch('/api/train-letter', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('✅ Success');
        setMessage(data.message || 'Upload completed.');
        const learned = data.learned || [];
        setLetters(learned.map(({ label, path }) => ({ label, path })));
      } else {
        setStatus('❌ Failed');
        setMessage(data.error || 'Upload error');
      }
    } catch (err) {
      setStatus('❌ Error');
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: 'auto' }}>
      <h1>🧪 Upload A–Z Calibration Grid</h1>
      <p>Upload a PDF or image of your handwritten grid. Lulu will crop and store the letters.</p>

      <label>
        Case:&nbsp;
        <select value={letterCase} onChange={e => setLetterCase(e.target.value)}>
          <option value="lower">Lowercase</option>
          <option value="upper">Uppercase</option>
        </select>
      </label>

      <br /><br />

      <input
        type="file"
        accept="application/pdf, image/*"
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
          cursor: 'pointer',
        }}
      >
        Submit Grid
      </button>

      <div style={{ marginTop: '1rem' }}>
        <strong>{status}</strong>
        <p>{message}</p>
      </div>

      {letters.length > 0 && (
        <div>
          <h2 style={{ marginTop: '2rem' }}>🔤 Extracted Letters</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {letters.map((entry, index) => {
              const label = entry.label || '?';
              const path = entry.path || '';
              return (
                <div key={`${label}-${index}`} style={{ textAlign: 'center' }}>
                  <img
                    src={path}
                    alt={label}
                    style={{
                      width: '100px',
                      height: '100px',
                      objectFit: 'contain',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <div style={{ fontWeight: 'bold' }}>{String(label).toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
