/* eslint-disable @typescript-eslint/no-explicit-any */
import { AsyncThunk, AsyncThunkAction, PayloadAction } from '@reduxjs/toolkit';
import Axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';
import { NavigateFunction } from 'react-router';

export interface AxiosClientConfig {
  /** Base URL for API requests */
  baseURL?: string;
  /** Additional headers to include with requests */
  headers?: Record<string, string>;
  /** Whether to include credentials (cookies) with requests */
  withCredentials?: boolean;
  /** Authentication interceptor configuration */
  authInterceptor?: {
    onFulfilled: (response: any) => any;
    onRejected: (error: any) => Promise<any>;
  };
}

/**
 * Creates axios clients with caching and authentication interceptors
 * 
 * @example
 * ```typescript
 * import { createAxiosClients } from '@haakco/api-client-interceptors';
 * import { createAuthInterceptor } from '@haakco/api-client-interceptors';
 * 
 * const authInterceptor = createAuthInterceptor({
 *   store,
 *   checkAuthAction: checkAuth,
 *   logoutAction: logout
 * });
 * 
 * const { axiosClientCached, axiosClientNoCache, csrf } = createAxiosClients({
 *   baseURL: process.env.REACT_APP_API_URL || '/api/v1',
 *   authInterceptor
 * });
 * ```
 */
export const createAxiosClients = (config: AxiosClientConfig = {}) => {
  const {
    baseURL = process.env.VITE_BACKEND_URL || '/api/v1',
    headers = {},
    withCredentials = true,
    authInterceptor
  } = config;

  // Create base axios instance without caching
  const axiosClientNoCache = Axios.create({
    baseURL,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    },
    withCredentials,
  });

  // Create cached version
  const axiosClientCached = setupCache(axiosClientNoCache);

  // Add auth interceptor if provided
  if (authInterceptor) {
    axiosClientCached.interceptors.response.use(authInterceptor.onFulfilled, authInterceptor.onRejected);
    axiosClientNoCache.interceptors.response.use(authInterceptor.onFulfilled, authInterceptor.onRejected);
  }

  // CSRF token helper
  const csrf = async () => {
    await axiosClientCached.get('/sanctum/csrf-cookie');
  };

  return {
    axiosClientCached,
    axiosClientNoCache,
    csrf,
    baseURL,
  };
};

/**
 * Helper function to handle navigation on successful Redux thunk fulfillment
 */
export const routeOnFulfilled = async (
  navigate: NavigateFunction,
  route: string,
  resultAction: AsyncThunkAction<any, any, any> | PayloadAction<any>,
  asyncThunk: AsyncThunk<any, any, any>,
) => {
  if (asyncThunk.fulfilled.match(resultAction)) {
    navigate(route);
  }
};

/**
 * Helper function to check if a Redux thunk action was fulfilled
 */
export const checkIfActionFulfilled = async (
  resultAction: AsyncThunkAction<any, any, any> | PayloadAction<any>,
  asyncThunk: AsyncThunk<any, any, any>,
) => {
  return asyncThunk.fulfilled.match(resultAction);
};

/**
 * Helper function to check if a Redux thunk action was rejected
 */
export const checkIfActionRejected = async (
  resultAction: AsyncThunkAction<any, any, any> | PayloadAction<any>,
  asyncThunk: AsyncThunk<any, any, any>,
) => {
  return asyncThunk.rejected.match(resultAction);
};

// Legacy exports for backward compatibility
export const baseURL = process.env.VITE_BACKEND_URL || '/api/v1';

// Default client instances (legacy)
const defaultClients = createAxiosClients();
export const axiosClientNoCache = defaultClients.axiosClientNoCache;
export const axiosClientCached = defaultClients.axiosClientCached;
export const csrf = defaultClients.csrf;

export default axiosClientCached;