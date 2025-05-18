import { useState } from 'react';
export default function VisionUpload() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/vision-calibrate', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setResponse(data);
    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🧠 Lulu Handprint Calibration</h1>
        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4"
          />
          <button
            type="submit"
            disabled={loading || !file}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? 'Uploading...' : 'Upload for Calibration'}
          </button>
        </form>
        {response && (
          <div className="mt-6 bg-gray-50 p-4 rounded shadow-sm">
            <p><strong>Status:</strong> {response.status}</p>
            <p><strong>Message:</strong> {response.message}</p>
            <p><strong>Confidence Score:</strong> {response.score}%</p>
            <p className="mt-4"><strong>Cleaned Text:</strong><br />{response.cleanedText}</p>
          </div>
        )}
      </div>
    </div>
  );
}