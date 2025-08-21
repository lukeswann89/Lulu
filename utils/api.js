// utils/api.js
class ApiError extends Error {
  constructor(message, status, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.meta = meta;
  }
}

async function luluFetch(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      // Let the browser set Content-Type for FormData, otherwise default to JSON
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  };

  try {
    // Ensure we use an absolute URL for the API call to guarantee stability.
    const baseURL = 'http://localhost:3000';
    const response = await fetch(`${baseURL}${endpoint}`, config);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, response.status, errorBody.meta);
    }

    // Handle cases where the response might be empty (204 No Content)
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    // **The Core "Stabilize" Logic: Normalize the response**
    if (json.hasOwnProperty('data') && json.hasOwnProperty('meta')) {
      return json; // Pass through the standard envelope
    } else {
      return { data: json, meta: {} }; // Wrap the raw response in our standard envelope
    }

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('LuluFetch Error:', error);
    throw new ApiError(error.message || 'An unexpected network error occurred.', 500);
  }
}

export const api = {
  post: (endpoint, body, options) => {
    const isFormData = body instanceof FormData;
    return luluFetch(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  get: (endpoint, options) => {
      return luluFetch(endpoint, { ...options, method: 'GET' });
  },
};
