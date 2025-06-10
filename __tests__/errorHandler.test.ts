import { describe, it, expect, vi } from 'vitest';
import { AxiosError } from 'axios';
import { processStoreError } from '../errorHandler';

describe('processStoreError', () => {
  it('should handle axios error with response', () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: {
          message: 'Validation failed',
          errors: { email: ['Email is required'] },
        },
      } as any
    );

    const result = processStoreError(axiosError);

    expect(result).toEqual({
      message: 'Validation failed',
      statusCode: 422,
      data: {
        message: 'Validation failed',
        errors: { email: ['Email is required'] },
      },
    });
  });

  it('should handle axios error without response data', () => {
    const axiosError = new AxiosError(
      'Network Error',
      'ERR_NETWORK',
      undefined,
      undefined,
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: null,
      } as any
    );

    const result = processStoreError(axiosError);

    expect(result).toEqual({
      message: 'Internal Server Error',
      statusCode: 500,
      data: null,
    });
  });

  it('should handle axios error without response', () => {
    const axiosError = new AxiosError('Network Error', 'ERR_NETWORK');

    const result = processStoreError(axiosError);

    expect(result).toEqual({
      message: 'Network Error',
      statusCode: 0,
      data: null,
    });
  });

  it('should handle regular error objects', () => {
    const regularError = new Error('Something went wrong');

    const result = processStoreError(regularError);

    expect(result).toEqual({
      message: 'Something went wrong',
      statusCode: 0,
      data: null,
    });
  });

  it('should handle string errors', () => {
    const stringError = 'String error message';

    const result = processStoreError(stringError);

    expect(result).toEqual({
      message: 'String error message',
      statusCode: 0,
      data: null,
    });
  });

  it('should handle unknown error types', () => {
    const unknownError = { someProperty: 'value' };

    const result = processStoreError(unknownError);

    expect(result).toEqual({
      message: 'An unknown error occurred',
      statusCode: 0,
      data: null,
    });
  });

  it('should extract message from response data object', () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        data: {
          message: 'Custom error message',
          code: 'INVALID_INPUT',
        },
      } as any
    );

    const result = processStoreError(axiosError);

    expect(result.message).toBe('Custom error message');
  });

  it('should fall back to status text when no message in data', () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 403,
        statusText: 'Forbidden',
        data: {},
      } as any
    );

    const result = processStoreError(axiosError);

    expect(result.message).toBe('Forbidden');
  });

  it('should handle timeout errors', () => {
    const timeoutError = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED');

    const result = processStoreError(timeoutError);

    expect(result).toEqual({
      message: 'timeout of 5000ms exceeded',
      statusCode: 0,
      data: null,
    });
  });
});