// pages/dashboard-malformed.js

import { useEffect, useState } from 'react';

export default function MalformedDashboard() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/logs/malformed-boxes.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load log');
        return res.json();
      })
      .then(setLogs)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚨 Malformed Letter Dashboard</h1>
      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
      {!error && logs.length === 0 && <p>No malformed letters logged.</p>}

      <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
        {logs.map((entry, idx) => (
          <div
            key={idx}
            style={{
              padding: '1rem',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: '#fefefe',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              maxWidth: '500px'
            }}
          >
            <h3>
              ❌ <code>{entry.box?.label || '?'}</code> ({entry.case}) failed
            </h3>
            <p>
              📦 <strong>Box:</strong> {JSON.stringify(entry.box)}
              <br />
              🕒 <strong>Time:</strong>{' '}
              {new Date(entry.timestamp).toLocaleString()}
              <br />
              ⚠️ <strong>Reason:</strong> {entry.reason}
            </p>
            {entry.image && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Source image</strong>
                <br />
                <img
                  src={entry.image}
                  alt="Source"
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    marginTop: '0.5rem'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
