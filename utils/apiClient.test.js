// /utils/apiClient.test.js
// Simple tests for the API client functionality

// Mock fetch globally
global.fetch = jest.fn();

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-request-id-123'
}));

describe('apiClient', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Success responses', () => {
    test('should unwrap envelope with data and meta', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          data: { suggestions: ['test'] },
          meta: { serverTime: 123 }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const { apiClient } = require('./apiClient');
      const result = await apiClient.post('/api/test');
      
      expect(result.data).toEqual({ suggestions: ['test'] });
      expect(result.meta.requestId).toBe('test-request-id-123');
      expect(result.meta.httpStatus).toBe(200);
      expect(result.meta.clientProcessingTimeMs).toBeGreaterThan(0);
    });

    test('should handle legacy direct JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({ suggestions: ['test'] })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const { apiClient } = require('./apiClient');
      const result = await apiClient.post('/api/test');
      
      expect(result.data).toEqual({ suggestions: ['test'] });
      expect(result.meta.requestId).toBe('test-request-id-123');
    });
  });

  describe('Error responses', () => {
    test('should throw error with metadata for non-200 responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({
          error: { message: 'Bad request' },
          meta: { serverError: 'validation_failed' }
        })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const { apiClient } = require('./apiClient');
      
      try {
        await apiClient.post('/api/test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.status).toBe(400);
        expect(error.requestId).toBe('test-request-id-123');
        expect(error.serverMeta).toEqual({ serverError: 'validation_failed' });
        expect(error.message).toBe('Bad request');
      }
    });
  });

  describe('Request configuration', () => {
    test('should include request ID header', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({ data: 'test' })
      };
      
      fetch.mockResolvedValue(mockResponse);
      
      const { apiClient } = require('./apiClient');
      await apiClient.post('/api/test', { test: 'data' });
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-request-id': 'test-request-id-123'
          })
        })
      );
    });
  });
});
