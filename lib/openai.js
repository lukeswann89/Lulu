// lib/openai.js
//
// This module defines a resilient factory for creating OpenAI clients on demand.
//
// The Lulu Codex emphasises "Resilient Initialization"—external dependencies
// must be created just‑in‑time, and they must never leak state across requests.
// Rather than instantiating a global OpenAI client at module load time, the
// `getOpenAIClient` function returns a fresh instance every time it's called.
// This ensures that each request has a clean, isolated client and avoids
// accidental re‑use of stateful resources. If the `OPENAI_API_KEY` is
// unavailable, an informative error is thrown so the API handler can respond
// gracefully.

import OpenAI from 'openai';

/**
 * Create a new OpenAI client using the API key from environment variables.
 *
 * The returned client is not cached; callers should call this function
 * whenever they need to interact with OpenAI. If the API key is missing,
 * an exception is thrown. This pattern supports the "Initialize Lazily"
 * principle described in our architecture documents.
 *
 * @returns {OpenAI} A freshly configured OpenAI client
 * @throws {Error} If the OPENAI_API_KEY environment variable is not set
 */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined');
  }
  return new OpenAI({ apiKey });
}
