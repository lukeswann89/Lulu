import { useState } from 'react';

export default function PdfUpload() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/pdf-to-images', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (res.ok) setImages(data.images || []);
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: 'auto' }}>
      <h1>📄 Upload Handwriting PDF</h1>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          marginLeft: '1rem',
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {loading ? 'Converting...' : 'Convert to Images'}
      </button>

      {images.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>🖼 Converted Pages</h2>
          {images.map((url, idx) => (
            <img key={idx} src={url} alt={`Page ${idx + 1}`} style={{ maxWidth: '100%', marginBottom: '1rem' }} />
          ))}
        </div>
      )}
    </div>
  );
}
