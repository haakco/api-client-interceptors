import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { createAuthInterceptor } from '../authInterceptor';

// Mock dependencies
const mockDispatch = vi.fn();
const mockNavigate = vi.fn();
const mockIsAuthenticated = vi.fn();

describe('createAuthInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create interceptor with default config', () => {
    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
    });

    expect(interceptor).toHaveProperty('onFulfilled');
    expect(interceptor).toHaveProperty('onRejected');
    expect(typeof interceptor.onFulfilled).toBe('function');
    expect(typeof interceptor.onRejected).toBe('function');
  });

  it('should pass through successful responses', async () => {
    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
    });

    const response = { status: 200, data: { success: true } };
    const result = await interceptor.onFulfilled(response as any);

    expect(result).toBe(response);
  });

  it('should handle 401 errors when user is authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
      logoutAction: { type: 'auth/logout' },
      loginPath: '/login',
    });

    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
    } as any);

    await expect(interceptor.onRejected(error)).rejects.toThrow(error);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should not redirect when user is already unauthenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
    });

    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
    } as any);

    await expect(interceptor.onRejected(error)).rejects.toThrow(error);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should pass through non-401 errors', async () => {
    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
    });

    const error = new AxiosError('Server Error', '500', undefined, undefined, {
      status: 500,
      statusText: 'Internal Server Error',
    } as any);

    await expect(interceptor.onRejected(error)).rejects.toThrow(error);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should handle custom logout action', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const customLogoutAction = { type: 'custom/logout', payload: { reason: 'expired' } };

    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
      logoutAction: customLogoutAction,
    });

    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
    } as any);

    await expect(interceptor.onRejected(error)).rejects.toThrow(error);
    expect(mockDispatch).toHaveBeenCalledWith(customLogoutAction);
  });

  it('should use custom login path', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    const interceptor = createAuthInterceptor({
      dispatch: mockDispatch,
      navigate: mockNavigate,
      isAuthenticated: mockIsAuthenticated,
      loginPath: '/auth/signin',
    });

    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
    } as any);

    await expect(interceptor.onRejected(error)).rejects.toThrow(error);
    expect(mockNavigate).toHaveBeenCalledWith('/auth/signin');
  });
});