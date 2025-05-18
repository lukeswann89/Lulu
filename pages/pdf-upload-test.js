import { useState } from 'react';

export default function PdfUploadTest() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/pdf-to-images', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.images) {
      setImages(data.images);
      setStatus('✅ Converted!');
    } else {
      setStatus('❌ Error: ' + (data.error || 'Unknown error'));
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🧪 PDF to Image Upload Test</h1>
      <p>Select a multi-page PDF to convert into images:</p>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
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
          cursor: 'pointer'
        }}
      >
        Convert PDF
      </button>

      <div style={{ marginTop: '1rem' }}>{status}</div>

      <div style={{ marginTop: '2rem' }}>
        {images.map((src, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <img src={src} alt={`Page ${i + 1}`} style={{ maxWidth: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
