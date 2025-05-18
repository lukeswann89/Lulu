import { useState } from 'react';

export default function TrainPDFPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [imagePaths, setImagePaths] = useState([]);

  const handleUpload = async () => {
    if (!file) return;

    setStatus('Uploading and processing...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/train-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('✅ Success! Converted images:');
        setImagePaths(data.images || []);
      } else {
        setStatus('❌ Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setStatus('❌ Upload failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>📄 Upload PDF Calibration Sheet</h1>
      <input
        type="file"
        accept="application/pdf"
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
        Upload & Convert
      </button>
      <div style={{ marginTop: '1rem' }}>{status}</div>
      {imagePaths.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          {imagePaths.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Page ${i + 1}`}
              style={{ width: '100%', marginBottom: '1rem', border: '1px solid #ccc' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
