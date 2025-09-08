/**
 * Red Line Grammar Check API
 *  * This API route serves as "The Voice" for Lulu's Passive Awareness system.
* It fetches raw grammar intelligence from LanguageTool and passes it back to 
 * "The Mind" (React front-end). This endpoint is designed to be:
 * - Fast and lightweight for frequent background calls
 * - Completely stateless with no database connections
 * - Self-contained with robust error handling
 *  * Endpoint: POST /api/grammar-check
 * Body: { "text": "manuscript chunk to analyze" }
 * Response: { "results": [...matches from LanguageTool] }
 */

export default async function handler(req, res) {
    // Validate HTTP method - only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method not allowed. Use POST.' 
      });
    }
  
    // Validate request body contains non-empty text property
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Request body must contain a non-empty text property.' 
      });
    }
  
    try {
      // Prepare URL-encoded body for LanguageTool API
      const params = new URLSearchParams();
      params.append('text', text);
      params.append('language', 'en-US');
  
      // --- ARCHITECT'S NOTE: This is the corrected fetch call structure. ---
      // It points to the local server and has the correct syntax.
      const LT_URL = process.env.LT_URL || 'http://localhost:8081';
      
      // Add timeout and better error handling for external service calls
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let response;
      try {
        response = await fetch(`${LT_URL}/v2/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('LanguageTool service unavailable:', fetchError.message);
        // Return graceful degradation instead of 500 error
        return res.status(200).json({ 
          results: [],
          message: 'Grammar service temporarily unavailable'
        });
      }      // Check if LanguageTool API responded successfully
      if (!response.ok) {
        console.error('LanguageTool API error:', response.status, response.statusText);
        return res.status(500).json({ 
          error: 'Failed to connect to grammar service.' 
        });
      }
  
      // Parse JSON response from LanguageTool
      const data = await response.json();
    // [AUDIT-VOICE] Raw API Response:
    console.log('[AUDIT-VOICE] Raw API Response:', JSON.stringify(data));
  
      // Extract matches array, defaulting to empty array if not present
      const matches = data.matches || [];
  
      // Send successful response with results
      return res.status(200).json({ 
        results: matches 
      });
  
    } catch (error) {
      // Log full error for debugging purposes
      console.error('Grammar check API error:', error);
  
      // Return user-safe error message
      return res.status(500).json({ 
        error: 'Failed to connect to grammar service.' 
      });
    }
  }