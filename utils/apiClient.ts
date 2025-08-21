/**
 * utils/apiClient.ts
 *
 * A clean, simple, and resilient API client for Lulu.
 * It uses the browser's native `fetch` API and provides a standardized
 * response envelope. This version prioritizes clarity and directness.
 */

// Define a standard error shape for consistent error handling.
class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface ApiClientOptions extends RequestInit {
  timeout?: number;
}

/**
 * The core fetch function with a timeout.
 * @param url The API endpoint URL.
 * @param options The request options.
 * @returns The parsed JSON response.
 */
async function coreFetch(url: string, options: ApiClientOptions = {}) {
  const { timeout = 180000 } = options; // Default timeout of 180 seconds

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      // Try to parse error details from the response body, if available.
      const errorDetails = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(`HTTP error! status: ${response.status}`, response.status, errorDetails);
    }

    // Return the full JSON body for the calling function to handle.
    return await response.json();

  } catch (error) {
    clearTimeout(id);
    if (error instanceof ApiError) {
      throw error; // Re-throw API errors to be handled by the caller.
    }
    // Handle fetch errors (e.g., network failure)
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`An internal server error occurred: ${errorMessage}`);
  }
}

/**
 * A simplified apiClient object with a `post` method.
 */
export const apiClient = {
  post: async <T>(url: string, body: Record<string, any>): Promise<T> => {
    return coreFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }) as Promise<T>;
  },
  // You can add get, put, delete methods here if needed in the future.
};
