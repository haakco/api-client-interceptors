# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package: @haakco/api-client-interceptors

**Purpose**: Provides authentication and error handling interceptors for HTTP clients (Axios/Fetch) with automatic token refresh, CSRF protection, and retry logic.

## Architecture Overview

This package implements the **Interceptor Pattern** for HTTP clients:

```
HTTP Request → Request Interceptors → API Call → Response Interceptors → Application
                     ↓                               ↓
              Token Attachment              Error Handling
              CSRF Headers                  Token Refresh
              Request Logging               Retry Logic
```

### Core Components

1. **Auth Interceptor** (`src/interceptors/authInterceptor.ts`)
   - Attaches Bearer tokens to requests
   - Handles 401 responses with automatic token refresh
   - Implements refresh token rotation
   - Queue management for concurrent requests during refresh

2. **CSRF Interceptor** (`src/interceptors/csrfInterceptor.ts`)
   - Manages XSRF tokens for state-changing requests
   - Automatic token extraction from cookies/meta tags
   - Laravel Sanctum compatible

3. **Error Interceptor** (`src/interceptors/errorInterceptor.ts`)
   - Standardized error transformation
   - Network error handling
   - Timeout management
   - Error logging integration

4. **Retry Interceptor** (`src/interceptors/retryInterceptor.ts`)
   - Exponential backoff strategy
   - Configurable retry conditions
   - Request idempotency checks

## Development Commands

```bash
# Development with watch mode
npm run dev

# Build the package
npm run build

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Linting
npm run lint:prettier  # Check formatting
npm run lint:eslint    # ESLint checks
npm run lint:fix       # Fix all issues

# Type checking
npm run type-check
```

## Testing Patterns

This package uses **Vitest** with **jsdom** environment for testing interceptors:

```typescript
// Mock axios instance
const mockAxios = {
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() }
  },
  defaults: { headers: { common: {} } }
};

// Test interceptor behavior
it('should handle token refresh', async () => {
  const interceptor = createAuthInterceptor(mockAxios, config);
  // Test implementation
});
```

## Integration with Other Packages

- **@haakco/api-client**: Primary consumer, uses these interceptors
- **@haakco/api-schemas**: Provides type definitions for API responses
- **@haakco/logging-system**: Error logging integration

## Key Implementation Details

### Token Storage Interface
```typescript
interface TokenStorage {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (access: string, refresh?: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}
```

### Request Queue Management
During token refresh, all concurrent requests are queued to prevent multiple refresh attempts:

```typescript
class RequestQueue {
  private queue: Array<() => void> = [];
  private isRefreshing = false;
  
  async processQueue() {
    // Implementation details in authInterceptor.ts
  }
}
```

## Common Issues and Solutions

### Circular Dependency with Token Refresh
- **Issue**: Refresh endpoint triggers auth interceptor
- **Solution**: Skip interceptor for refresh endpoint using config flag

### CSRF Token Timing
- **Issue**: CSRF token not available on first request
- **Solution**: Fetch CSRF token before first state-changing request

### Testing Async Interceptors
- **Issue**: Testing promise-based interceptor chains
- **Solution**: Use async test utilities and proper mocking

## Performance Considerations

- Token storage should use fast async storage (memory cache + persistent)
- Minimize interceptor overhead for high-frequency requests
- Consider request debouncing for token refresh
