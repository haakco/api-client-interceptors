/**
 * @haakco/api-client-interceptors
 * 
 * Production-tested axios interceptors for authentication, caching, and error handling
 * extracted from CourierBoost platform.
 */

// Authentication interceptors
export {
  createAuthInterceptor,
  createAuthInterceptorLegacy,
  type AuthInterceptorConfig,
} from './authInterceptor';

// Axios client setup with caching
export {
  createAxiosClients,
  routeOnFulfilled,
  checkIfActionFulfilled,
  checkIfActionRejected,
  axiosClientCached,
  axiosClientNoCache,
  csrf,
  baseURL,
  type AxiosClientConfig,
} from './axiosClientCached';

// Error handling utilities
export {
  processStoreError,
  extractValidationErrors,
  isNetworkError,
  isAuthError,
  isAuthorizationError,
  isValidationError,
  isServerError,
  getUserFriendlyMessage,
  type ProcessedError,
} from './errorHandler';

// Re-export commonly used types
export type { AxiosInstance } from 'axios';
export type { CacheInstance } from 'axios-cache-interceptor';