import { AxiosError, AxiosResponse } from 'axios';

let isCheckingAuth = false;

export interface AuthInterceptorConfig {
  /** Redux store for dispatching actions */
  store: {
    dispatch: (action: any) => Promise<any>;
  };
  /** Action creator for checking auth status */
  checkAuthAction: any;
  /** Action creator for logging out */
  logoutAction: any;
  /** Auth check endpoint pattern to avoid infinite loops */
  authCheckPattern?: string;
  /** Login page path for redirects */
  loginPath?: string;
}

/**
 * Creates an authentication interceptor for axios that handles 401 responses
 * by verifying authentication status before logging out the user.
 * 
 * @example
 * ```typescript
 * import { createAuthInterceptor } from '@haakco/api-client-interceptors';
 * import { store } from './store';
 * import { checkAuth, logout } from './auth-slice';
 * 
 * const authInterceptor = createAuthInterceptor({
 *   store,
 *   checkAuthAction: checkAuth,
 *   logoutAction: logout,
 *   authCheckPattern: '/me/check',
 *   loginPath: '/login'
 * });
 * 
 * axiosInstance.interceptors.response.use(
 *   authInterceptor.onFulfilled,
 *   authInterceptor.onRejected
 * );
 * ```
 */
export const createAuthInterceptor = (config: AuthInterceptorConfig) => {
  const {
    store,
    checkAuthAction,
    logoutAction,
    authCheckPattern = '/me/check',
    loginPath = '/login'
  } = config;

  return {
    onFulfilled: (response: AxiosResponse) => response,
    onRejected: async (error: AxiosError) => {
      // Only handle 401 responses
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // Skip if this is already an auth check request to prevent infinite loop
      if (error.config?.url?.includes(authCheckPattern)) {
        return Promise.reject(error);
      }

      // Prevent multiple simultaneous auth checks
      if (isCheckingAuth) {
        return Promise.reject(error);
      }

      isCheckingAuth = true;

      try {
        // Dispatch the auth check
        const resultAction = await store.dispatch(checkAuthAction());

        // Check if the auth check was successful
        if (checkAuthAction.fulfilled?.match(resultAction)) {
          // Auth check succeeded, user is still logged in
          // The original 401 might be for a different reason (permissions, etc.)
          isCheckingAuth = false;
          return Promise.reject(error);
        }

        // Check if the auth check also returned 401
        if (checkAuthAction.rejected?.match(resultAction)) {
          const rejectedPayload = resultAction.payload as { error?: { statusCode?: number } };
          if (rejectedPayload?.error?.statusCode === 401) {
            // Auth check confirmed user is not authenticated
            // Log them out and redirect
            await store.dispatch(logoutAction());

            // Redirect to login page
            if (typeof window !== 'undefined' && window.location.pathname !== loginPath) {
              window.location.href = loginPath;
            }
          }
        }
      } catch (err) {
        console.error('Error during auth verification:', err);
      } finally {
        isCheckingAuth = false;
      }

      return Promise.reject(error);
    },
  };
};

/**
 * Legacy version for direct CourierBoost compatibility
 * @deprecated Use createAuthInterceptor with config instead
 */
export const createAuthInterceptorLegacy = () => {
  return {
    onFulfilled: (response: AxiosResponse) => response,
    onRejected: async (error: AxiosError) => {
      // Only handle 401 responses
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      // Skip if this is already a meCheckIfLoggedIn request to prevent infinite loop
      if (error.config?.url?.includes('/me/check')) {
        return Promise.reject(error);
      }

      // Prevent multiple simultaneous auth checks
      if (isCheckingAuth) {
        return Promise.reject(error);
      }

      isCheckingAuth = true;

      try {
        // Note: Legacy version requires manual integration with your store
        console.warn('Using legacy auth interceptor - consider upgrading to createAuthInterceptor');
      } catch (err) {
        console.error('Error during auth verification:', err);
      } finally {
        isCheckingAuth = false;
      }

      return Promise.reject(error);
    },
  };
};