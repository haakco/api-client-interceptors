import { AxiosError } from 'axios';

export interface ProcessedError {
  statusCode: number;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  isAxiosError: boolean;
  originalError: unknown;
}

/**
 * Processes an unknown error input into a standardized ProcessedError object,
 * focusing on errors typically encountered in Redux thunks.
 * 
 * This function provides consistent error handling across your application by:
 * - Extracting meaningful messages from various error types
 * - Preserving HTTP status codes for proper error handling
 * - Providing fallback messages for unknown error types
 * - Maintaining the original error for debugging
 * 
 * @param error - The error to process (unknown type).
 * @returns A ProcessedError object with consistent structure.
 * 
 * @example
 * ```typescript
 * import { processStoreError } from '@haakco/api-client-interceptors';
 * 
 * // In a Redux thunk
 * const myThunk = createAsyncThunk('api/getData', async (_, { rejectWithValue }) => {
 *   try {
 *     const response = await api.getData();
 *     return response.data;
 *   } catch (error) {
 *     const processedError = processStoreError(error);
 *     return rejectWithValue(processedError);
 *   }
 * });
 * 
 * // In error handling
 * if (error) {
 *   const { statusCode, message, data } = processStoreError(error);
 *   if (statusCode === 422) {
 *     // Handle validation errors
 *     showValidationErrors(data.errors);
 *   } else {
 *     // Show generic error message
 *     showErrorToast(message);
 *   }
 * }
 * ```
 */
export function processStoreError(error: unknown): ProcessedError {
  let statusCode: number = 0; // Default for non-HTTP or unknown errors
  let message: string = 'An unexpected error occurred. Please try again.';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorData: any | undefined;
  let isAxiosError = false;

  if (error instanceof AxiosError) {
    isAxiosError = true;
    statusCode = error.response?.status || 0; // Use 0 if no response/status
    // Prioritize Laravel's error message structure if available
    message = error.response?.data?.message || error.message || 'A server communication error occurred.';
    errorData = error.response?.data;
  } else if (error instanceof Error) {
    // Standard JavaScript Error
    message = error.message;
  } else if (typeof error === 'string' && error.trim() !== '') {
    // Plain string error
    message = error;
  } else if (error && typeof error === 'object') {
    // Attempt to extract message if it's a plain object with a message property
    if ('message' in error && typeof error.message === 'string' && error.message.trim() !== '') {
      message = error.message;
    }
    // Check for statusCode if it's a custom error object
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      statusCode = error.statusCode;
    }
    if ('data' in error) {
      errorData = error.data;
    }
  }

  return {
    statusCode,
    message,
    data: errorData,
    isAxiosError,
    originalError: error,
  };
}

/**
 * Helper function to extract validation errors from Laravel-style error responses
 * 
 * @param processedError - Error processed by processStoreError
 * @returns Object with field-specific validation errors, or null if not a validation error
 * 
 * @example
 * ```typescript
 * const processedError = processStoreError(error);
 * const validationErrors = extractValidationErrors(processedError);
 * 
 * if (validationErrors) {
 *   // Handle field-specific errors
 *   Object.entries(validationErrors).forEach(([field, messages]) => {
 *     setFieldError(field, messages[0]);
 *   });
 * }
 * ```
 */
export function extractValidationErrors(processedError: ProcessedError): Record<string, string[]> | null {
  if (processedError.statusCode === 422 && processedError.data?.errors) {
    return processedError.data.errors;
  }
  return null;
}

/**
 * Helper function to determine if an error is a network/connectivity issue
 */
export function isNetworkError(processedError: ProcessedError): boolean {
  return processedError.isAxiosError && processedError.statusCode === 0;
}

/**
 * Helper function to determine if an error is an authentication issue
 */
export function isAuthError(processedError: ProcessedError): boolean {
  return processedError.statusCode === 401;
}

/**
 * Helper function to determine if an error is an authorization/permission issue
 */
export function isAuthorizationError(processedError: ProcessedError): boolean {
  return processedError.statusCode === 403;
}

/**
 * Helper function to determine if an error is a validation issue
 */
export function isValidationError(processedError: ProcessedError): boolean {
  return processedError.statusCode === 422;
}

/**
 * Helper function to determine if an error is a server error
 */
export function isServerError(processedError: ProcessedError): boolean {
  return processedError.statusCode >= 500;
}

/**
 * Helper function to get a user-friendly error message based on status code
 */
export function getUserFriendlyMessage(processedError: ProcessedError): string {
  if (isNetworkError(processedError)) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (isAuthError(processedError)) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (isAuthorizationError(processedError)) {
    return 'You do not have permission to perform this action.';
  }
  
  if (isValidationError(processedError)) {
    return 'Please check the form for errors and try again.';
  }
  
  if (isServerError(processedError)) {
    return 'A server error occurred. Please try again later.';
  }
  
  return processedError.message;
}