import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [diffWords, setDiffWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [gptConfirmed, setGptConfirmed] = useState(false);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setImagePreview(URL.createObjectURL(uploadedFile));
      setOcrText('');
      setOriginalText('');
      setCorrectedText('');
      setDiffWords([]);
      setAccuracy(null);
      setConfirmed(false);
      setGptConfirmed(false);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.text) {
        setOcrText(data.text);
        setOriginalText(data.text);
      } else {
        setError(data.error || 'OCR failed.');
      }
    } catch (err) {
      setError('Upload error.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const originalWords = originalText.trim().split(/\s+/);
    const editedWords = ocrText.trim().split(/\s+/);

    let same = 0;
    for (let i = 0; i < Math.min(originalWords.length, editedWords.length); i++) {
      if (originalWords[i] === editedWords[i]) same++;
    }

    const score = originalWords.length
      ? Math.round((same / originalWords.length) * 100)
      : 0;

    setAccuracy(score);
    setConfirmed(true);

    await fetch('/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctedText: ocrText,
        accuracy: score,
      }),
    });
  };

  const handleSmartFix = async () => {
    if (!ocrText) return;
    const res = await fetch('/api/smart-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocrText }),
    });
    const data = await res.json();
    setCorrectedText(data.corrected || '');
    setDiffWords(getWordDiff(ocrText, data.corrected || ''));
  };

  const getWordDiff = (original, revised) => {
    const orig = original.split(/\s+/);
    const rev = revised.split(/\s+/);
    return rev.map((word, i) => ({
      word,
      changed: word !== orig[i],
    }));
  };

  const handleGptConfirm = async () => {
    await fetch('/api/save-correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocr: ocrText, confirmed: correctedText }),
    });
    setGptConfirmed(true);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: 'auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>🖼 Upload Handwritten Scan</h1>

      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button
          type="submit"
          disabled={!file || loading}
          style={{
            marginLeft: '1rem',
            padding: '8px 16px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Processing...' : 'Start OCR'}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginTop: '1rem' }}>❌ {error}</div>}

      {imagePreview && (
        <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          <div style={{ flex: 1 }}>
            <h2>🖼 Image Preview</h2>
            <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', borderRadius: '8px' }} />
          </div>

          <div style={{ flex: 1 }}>
            <h2>📝 OCR Result (editable)</h2>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              style={{
                width: '100%',
                height: '400px',
                padding: '1rem',
                fontFamily: 'monospace',
                border: '1px solid #ccc',
                borderRadius: '8px',
              }}
              placeholder="OCR result will appear here..."
            />
            {!confirmed && (
              <button
                onClick={handleConfirm}
                style={{
                  marginTop: '1rem',
                  padding: '10px 20px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                }}
              >
                Confirm & Save
              </button>
            )}
            {confirmed && (
              <div style={{ marginTop: '1rem', color: 'green', fontWeight: 'bold' }}>
                ✅ Saved! OCR accuracy: {accuracy}%
              </div>
            )}

            {ocrText && (
              <>
                <button
                  onClick={handleSmartFix}
                  style={{
                    marginTop: '1.5rem',
                    padding: '10px 20px',
                    backgroundColor: '#673ab7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                  }}
                >
                  ✨ Smart Fix
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {correctedText && (
        <div style={{ marginTop: '2rem' }}>
          <h2>✅ GPT-Corrected Text</h2>
          <div
            style={{
              background: '#f4f4f4',
              padding: '1rem',
              borderRadius: '8px',
              lineHeight: '1.6',
            }}
          >
            {diffWords.map(({ word, changed }, i) => (
              <span key={i} style={{ backgroundColor: changed ? '#fff59d' : 'transparent', marginRight: '6px' }}>
                {word}
              </span>
            ))}
          </div>
          {!gptConfirmed && (
            <button
              onClick={handleGptConfirm}
              style={{
                marginTop: '1rem',
                padding: '10px 20px',
                backgroundColor: '#009688',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
              }}
            >
              Confirm & Save GPT Fix
            </button>
          )}
          {gptConfirmed && (
            <div style={{ marginTop: '1rem', color: 'green', fontWeight: 'bold' }}>
              ✅ GPT Correction saved!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
