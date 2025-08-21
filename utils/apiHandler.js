// /utils/apiHandler.js
import { randomUUID } from 'crypto';

export function createApiHandler(handler) {
  return async (req, res) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const startTime = Date.now();
    console.log(`[${requestId}] ${req.method} ${req.url} - Request started`);

    try {
      // Pass control to the actual route handler
      const data = await handler(req, res);

      // If the handler already sent a response, do nothing.
      if (res.headersSent) {
        console.log(`[${requestId}] ${req.method} ${req.url} - Response already sent by handler. Took ${Date.now() - startTime}ms.`);
        return;
      }

      const meta = {
        requestId,
        processingTimeMs: Date.now() - startTime,
      };

      // Send the standardized success envelope
      // Spread the data properties directly to avoid double-nesting
      return res.status(200).json({ ...data, meta });

    } catch (error) {
      const meta = {
        requestId,
        processingTimeMs: Date.now() - startTime,
      };
      console.error(`[${requestId}] ${req.method} ${req.url} - Unhandled error:`, error);

      // Send the standardized error envelope
      return res.status(500).json({
        error: { message: 'An internal server error occurred.' },
        meta
      });
    }
  };
}
