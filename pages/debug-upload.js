import { useState } from 'react';
export default function DebugUpload() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.text || JSON.stringify(data, null, 2));
        setStatus('Success!');
      } else {
        setResponse(data.error || 'Unknown error');
        setStatus('Error!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('Upload failed.');
      setResponse(error.toString());
    }
  };
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug Upload Page</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload
        </button>
      </form>
      <div className="mt-4">
        <p className="font-semibold">{status}</p>
        <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap mt-2">
          {response}
        </pre>
      </div>
    </div>
  );
}
