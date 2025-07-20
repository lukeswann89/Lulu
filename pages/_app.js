// /pages/_app.js
import '../styles/globals.css';
import '../styles/prosemirror.css';
import React from 'react';

// --- NEW: Import the WorkflowProvider we just created ---
import { WorkflowProvider } from '../context/WorkflowContext';

export default function App({ Component, pageProps }) {
  // --- CHANGED: Wrap the main component with the WorkflowProvider ---
  return (
    <WorkflowProvider>
      <Component {...pageProps} />
    </WorkflowProvider>
  );
}