# @haakco/api-client-interceptors

> Production-tested axios interceptors for authentication, caching, and error handling

A comprehensive collection of HTTP client interceptors extracted from the CourierBoost platform, providing authentication flows, intelligent caching, error handling, and Redux integration for robust API communication.

## Features

- **JWT Authentication**: Automatic token refresh and authentication flows
- **Intelligent Caching**: Built-in HTTP caching with axios-cache-interceptor
- **Error Handling**: Comprehensive error processing with retry logic
- **Redux Integration**: Seamless integration with Redux Toolkit
- **React Router Integration**: Automatic navigation on authentication errors
- **TypeScript Support**: Full type safety and excellent IntelliSense
- **Production Tested**: Battle-tested in high-traffic applications
- **Configurable**: Flexible configuration for different environments
- **Offline Support**: Graceful handling of network connectivity issues

## Installation

```bash
npm install @haakco/api-client-interceptors
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install axios axios-cache-interceptor @reduxjs/toolkit react-router
```

## Quick Start

### Basic Setup

```typescript
import { createAuthenticatedClient } from '@haakco/api-client-interceptors';
import { store } from './store';
import { navigate } from './router';

// Create an authenticated HTTP client
const apiClient = createAuthenticatedClient({
  baseURL: 'https://api.example.com',
  tokenSelector: (state) => state.auth.token,
  refreshTokenSelector: (state) => state.auth.refreshToken,
  store,
  navigate,
});

// Use the client for API calls
const response = await apiClient.get('/users');
```

### Manual Setup

```typescript
import axios from 'axios';
import { setupAuth, setupCaching, setupErrorHandling } from '@haakco/api-client-interceptors';

const client = axios.create({
  baseURL: 'https://api.example.com',
});

// Add authentication interceptor
setupAuth(client, {
  tokenSelector: (state) => state.auth.token,
  refreshTokenSelector: (state) => state.auth.refreshToken,
  store,
  navigate,
});

// Add caching
setupCaching(client);

// Add error handling
setupErrorHandling(client, {
  retryAttempts: 3,
  retryDelay: 1000,
});
```

## Core Components

### Authentication Interceptor

Handles JWT token authentication with automatic refresh:

```typescript
import { setupAuth } from '@haakco/api-client-interceptors/auth';

setupAuth(client, {
  // Required: Token selectors
  tokenSelector: (state) => state.auth.accessToken,
  refreshTokenSelector: (state) => state.auth.refreshToken,
  
  // Required: Redux store for state access
  store,
  
  // Required: Navigation function for redirects
  navigate,
  
  // Optional: Custom configuration
  tokenPrefix: 'Bearer',
  refreshEndpoint: '/auth/refresh',
  loginPath: '/login',
  excludeUrls: ['/public-endpoint'],
  
  // Optional: Custom token refresh logic
  onTokenRefresh: async (refreshToken) => {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },
  
  // Optional: Custom error handling
  onAuthError: (error) => {
    console.error('Authentication failed:', error);
  },
});
```

### Caching Interceptor

Provides intelligent HTTP caching using axios-cache-interceptor:

```typescript
import { setupCaching, createCachedClient } from '@haakco/api-client-interceptors/cache';

// Method 1: Add caching to existing client
setupCaching(client, {
  // Cache for 5 minutes by default
  ttl: 5 * 60 * 1000,
  
  // Custom cache key generation
  generateKey: (request) => {
    return `${request.method}:${request.url}:${JSON.stringify(request.params)}`;
  },
  
  // Cache only GET requests by default
  methods: ['get'],
  
  // Custom storage (defaults to memory)
  storage: customStorage,
});

// Method 2: Create new cached client
const cachedClient = createCachedClient({
  baseURL: 'https://api.example.com',
  cache: {
    ttl: 10 * 60 * 1000, // 10 minutes
    interpretHeader: true, // Respect Cache-Control headers
  },
});
```

### Error Handling Interceptor

Comprehensive error handling with retry logic:

```typescript
import { setupErrorHandling } from '@haakco/api-client-interceptors/errors';

setupErrorHandling(client, {
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx responses
    return !error.response || error.response.status >= 500;
  },
  
  // Custom error transformation
  transformError: (error) => {
    if (error.response?.status === 422) {
      return {
        ...error,
        userMessage: 'Please check your input and try again',
        validationErrors: error.response.data.errors,
      };
    }
    return error;
  },
  
  // Global error handlers
  onError: (error) => {
    // Log to monitoring service
    console.error('API Error:', error);
  },
  
  onRetry: (retryCount, error) => {
    console.log(`Retrying request (attempt ${retryCount}):`, error.config?.url);
  },
});
```

## Advanced Usage

### Redux Integration

Full integration with Redux Toolkit for state management:

```typescript
// store/authSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    accessToken: null,
    refreshToken: null,
    user: null,
    isLoading: false,
  },
  reducers: {
    setTokens: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearAuth: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
    },
  },
});

// API client setup
const apiClient = createAuthenticatedClient({
  baseURL: process.env.REACT_APP_API_URL,
  tokenSelector: (state) => state.auth.accessToken,
  refreshTokenSelector: (state) => state.auth.refreshToken,
  store,
  navigate,
  onTokenRefresh: async (refreshToken) => {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const tokens = await response.json();
    
    // Update Redux store
    store.dispatch(authSlice.actions.setTokens(tokens));
    
    return tokens;
  },
});
```

### Custom Cache Storage

Implement custom cache storage for persistence:

```typescript
import { setupCaching } from '@haakco/api-client-interceptors/cache';

// Custom storage implementation
const persistentStorage = {
  get: async (key) => {
    const item = localStorage.getItem(`api-cache:${key}`);
    return item ? JSON.parse(item) : undefined;
  },
  
  set: async (key, value) => {
    localStorage.setItem(`api-cache:${key}`, JSON.stringify(value));
  },
  
  remove: async (key) => {
    localStorage.removeItem(`api-cache:${key}`);
  },
  
  clear: async () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api-cache:')) {
        localStorage.removeItem(key);
      }
    });
  },
};

setupCaching(client, {
  storage: persistentStorage,
  ttl: 30 * 60 * 1000, // 30 minutes
});
```

### Error Recovery Strategies

Implement sophisticated error recovery:

```typescript
import { setupErrorHandling } from '@haakco/api-client-interceptors/errors';

setupErrorHandling(client, {
  retryAttempts: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000, // Exponential backoff
  
  retryCondition: (error) => {
    // Don't retry client errors (4xx) except 408, 429
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 408 || status === 429;
    }
    
    // Retry network errors
    return true;
  },
  
  transformError: (error) => {
    const baseError = {
      ...error,
      timestamp: new Date().toISOString(),
      requestId: error.response?.headers?.['x-request-id'],
    };
    
    // Add user-friendly messages based on error type
    if (!error.response) {
      return {
        ...baseError,
        userMessage: 'Network error. Please check your connection.',
        type: 'NETWORK_ERROR',
      };
    }
    
    const status = error.response.status;
    
    if (status === 401) {
      return {
        ...baseError,
        userMessage: 'Authentication required. Please log in.',
        type: 'AUTH_ERROR',
      };
    }
    
    if (status === 403) {
      return {
        ...baseError,
        userMessage: 'You do not have permission to perform this action.',
        type: 'PERMISSION_ERROR',
      };
    }
    
    if (status === 404) {
      return {
        ...baseError,
        userMessage: 'The requested resource was not found.',
        type: 'NOT_FOUND_ERROR',
      };
    }
    
    if (status === 422) {
      return {
        ...baseError,
        userMessage: 'Please check your input and try again.',
        type: 'VALIDATION_ERROR',
        validationErrors: error.response.data?.errors || {},
      };
    }
    
    if (status >= 500) {
      return {
        ...baseError,
        userMessage: 'Server error. Please try again later.',
        type: 'SERVER_ERROR',
      };
    }
    
    return {
      ...baseError,
      userMessage: 'An unexpected error occurred.',
      type: 'UNKNOWN_ERROR',
    };
  },
});
```

### Request/Response Interceptors

Add custom request and response processing:

```typescript
// Add request ID for tracking
client.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = crypto.randomUUID();
  config.metadata = { startTime: Date.now() };
  return config;
});

// Add response timing
client.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata?.startTime;
    console.log(`Request to ${response.config.url} took ${duration}ms`);
    return response;
  },
  (error) => {
    const duration = Date.now() - error.config?.metadata?.startTime;
    console.log(`Failed request to ${error.config?.url} took ${duration}ms`);
    return Promise.reject(error);
  }
);
```

## API Reference

### createAuthenticatedClient(options)

Creates a fully configured HTTP client with authentication, caching, and error handling.

```typescript
interface AuthenticatedClientOptions {
  baseURL?: string;
  tokenSelector: (state: any) => string | null;
  refreshTokenSelector: (state: any) => string | null;
  store: any; // Redux store
  navigate: (path: string) => void;
  
  // Authentication options
  tokenPrefix?: string;
  refreshEndpoint?: string;
  loginPath?: string;
  excludeUrls?: string[];
  onTokenRefresh?: (refreshToken: string) => Promise<any>;
  onAuthError?: (error: any) => void;
  
  // Cache options
  cache?: {
    ttl?: number;
    storage?: any;
    methods?: string[];
  };
  
  // Error handling options
  errorHandling?: {
    retryAttempts?: number;
    retryDelay?: number | ((retryCount: number) => number);
    retryCondition?: (error: any) => boolean;
    transformError?: (error: any) => any;
    onError?: (error: any) => void;
  };
}
```

### setupAuth(client, options)

Adds authentication interceptor to existing axios client.

### setupCaching(client, options)

Adds caching interceptor to existing axios client.

### setupErrorHandling(client, options)

Adds error handling interceptor to existing axios client.

## Best Practices

### 1. Environment Configuration

```typescript
// config/api.ts
export const createApiClient = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return createAuthenticatedClient({
    baseURL: process.env.REACT_APP_API_URL,
    tokenSelector: (state) => state.auth.accessToken,
    refreshTokenSelector: (state) => state.auth.refreshToken,
    store,
    navigate,
    
    cache: {
      ttl: isDevelopment ? 30000 : 300000, // 30s dev, 5min prod
      methods: ['get', 'head'],
    },
    
    errorHandling: {
      retryAttempts: isDevelopment ? 1 : 3,
      retryDelay: 1000,
    },
  });
};
```

### 2. Request Cancellation

```typescript
import { useEffect, useRef } from 'react';

function useApiCall() {
  const abortControllerRef = useRef<AbortController>();
  
  const makeRequest = async (url: string) => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    return apiClient.get(url, {
      signal: abortControllerRef.current.signal,
    });
  };
  
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  
  return { makeRequest };
}
```

### 3. Error Boundary Integration

```typescript
// ErrorBoundary.tsx
import { useEffect } from 'react';
import { setupErrorHandling } from '@haakco/api-client-interceptors/errors';

setupErrorHandling(apiClient, {
  onError: (error) => {
    // Report to error tracking service
    if (error.type === 'SERVER_ERROR') {
      errorTracker.captureException(error);
    }
    
    // Show user notification for certain errors
    if (error.userMessage) {
      notificationService.show({
        type: 'error',
        message: error.userMessage,
      });
    }
  },
});
```

## Performance Considerations

- **Request Deduplication**: Cache interceptor automatically deduplicates identical requests
- **Memory Management**: Configure appropriate cache TTL and storage limits
- **Bundle Size**: Import only the interceptors you need to minimize bundle size
- **Network Optimization**: Use appropriate cache headers and request compression

## Browser Support

- Modern browsers with ES2020 support
- React 18+
- TypeScript 5.0+
- Axios 1.6+

## Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Build: `npm run build`

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Packages

- [`@haakco/logging-system`](../logging-system) - Comprehensive logging framework
- [`@haakco/api-schemas`](../api-schemas) - Zod validation schemas
- [`@haakco/debug-panel-react`](../debug-panel-react) - React debugging components

---

**Note**: This package is extracted from the CourierBoost platform and represents battle-tested patterns used in production applications handling millions of API requests daily.
