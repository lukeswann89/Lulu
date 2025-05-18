import { useState } from 'react';
export default function Write() {
  const [image, setImage] = useState(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Processing...');
    const formData = new FormData();
    formData.append('file', image);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setText(data.text);
        setStatus('Done!');
      } else {
        setStatus(`Error: ${data.error}`);
        console.error(data.debug || data.error);
      }
    } catch (err) {
      setStatus('Error uploading file');
      console.error(err);
    }
  };
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Handwriting</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
        <input
          type="file"
          accept="image/*"
          name="file"
          required
          onChange={(e) => setImage(e.target.files[0])}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Upload & Process
        </button>
      </form>
      <p className="mt-4 text-gray-600">{status}</p>
      {text && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Extracted Text:</h2>
          <pre className="whitespace-pre-wrap">{text}</pre>
        </div>
      )}
    </div>
  );
}
