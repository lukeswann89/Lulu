// /pages/_app.js
import '../styles/globals.css';
import '../styles/prosemirror.css';  // ← Added this line
import React from 'react';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}