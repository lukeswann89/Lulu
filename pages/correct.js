import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function CorrectPage() {
  const router = useRouter();
  const { ocrId } = router.query;

  const [imageUrl, setImageURL] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!ocrId) return;
    fetch(`/api/ocr?id=${ocrId}`)
      .then((res) => res.json())
      .then((data) => {
        setImageURL(data.imageUrl);
        setText(data.text);
      });
  }, [ocrId]);

  const handleSubmit = async () => {
    await fetch('/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocrId, correctedText: text }),
    });
    router.push('/dashboard');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h1>📝 Review OCR Results</h1>
      {imageUrl && (
        <img src={imageUrl} alt="Uploaded" style={{ maxWidth: '100%', marginBottom: '1rem' }} />
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: '100%', height: '200px', padding: '1rem', fontSize: '1rem' }}
      />
      <br />
      <button onClick={handleSubmit} style={{ marginTop: '1rem', padding: '10px 20px', fontSize: '16px' }}>
        Submit Corrections
      </button>
    </div>
  );
}