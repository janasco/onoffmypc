const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://api.onoffmypc.com';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: string;
  status?: number;
}

export async function apiReq<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Gated pages redirect logic can be handled in page components or custom hooks
      return { error: 'unauthorized', status: 401 };
    }

    // The response body is typed by the caller's generic parameter: the API
    // contract is trusted at this boundary, and `T` documents the expected
    // shape. Parse failures yield an empty object rather than throwing.
    const parsed: unknown = await res.json().catch(() => ({}));
    const data = parsed as { error?: string; code?: string } & Record<string, unknown>;

    if (!res.ok) {
      return {
        error: data.error || 'request failed',
        code: data.code,
        status: res.status,
      };
    }
    return { data: parsed as T };
  } catch {
    return { error: 'network error' };
  }
}

export const api = {
  login: <T = unknown>(email: string, password: string, turnstile_token?: string) =>
    apiReq<T>('POST', '/auth/login', { email, password, turnstile_token }),
  googleAuth: <T = unknown>(credential: string) =>
    apiReq<T>('POST', '/auth/google', { credential }),
  appleAuth: <T = unknown>(credential: string) =>
    apiReq<T>('POST', '/auth/apple', { credential }),
  microsoftAuth: <T = unknown>(credential: string) =>
    apiReq<T>('POST', '/auth/microsoft', { credential }),
  register: <T = unknown>(email: string, password: string, invite_code?: string, turnstile_token?: string) =>
    apiReq<T>('POST', '/auth/register', { email, password, invite_code, turnstile_token }),
  registrationStatus: <T = unknown>() =>
    apiReq<T>('GET', '/auth/registration-status'),
  joinWaitlist: <T = unknown>(email: string) =>
    apiReq<T>('POST', '/waitlist', { email }),
  logout: <T = unknown>() =>
    apiReq<T>('POST', '/auth/logout'),
  me: <T = unknown>() =>
    apiReq<T>('GET', '/auth/me'),
  exportData: <T = unknown>() =>
    apiReq<T>('GET', '/auth/export'),
  deleteAccount: <T = unknown>() =>
    apiReq<T>('DELETE', '/auth/account'),
  cancelDeletion: <T = unknown>() =>
    apiReq<T>('POST', '/auth/account/cancel-deletion'),
  forgotPassword: <T = unknown>(email: string) =>
    apiReq<T>('POST', '/auth/forgot-password', { email }),
  resetPassword: <T = unknown>(token: string, password: string) =>
    apiReq<T>('POST', '/auth/reset-password', { token, password }),
  verifyEmail: <T = unknown>(token: string) =>
    apiReq<T>('GET', `/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerify: <T = unknown>() =>
    apiReq<T>('POST', '/auth/resend-verify'),
  changePassword: <T = unknown>(current_password: string, new_password: string) =>
    apiReq<T>('POST', '/auth/change-password', { current_password, new_password }),
  changeEmail: <T = unknown>(new_email: string, password: string) =>
    apiReq<T>('POST', '/auth/change-email', { new_email, password }),
  devices: <T = unknown>() =>
    apiReq<T>('GET', '/devices'),
  getDevice: <T = unknown>(id: string) =>
    apiReq<T>('GET', `/devices/${id}`),
  deviceStatus: <T = unknown>(id: string) =>
    apiReq<T>('GET', `/devices/${id}/status`),
  history: <T = unknown>(id: string, days = 7) =>
    apiReq<T>('GET', `/telemetry/${id}/history?days=${days}`),
  addDevice: <T = unknown>(name: string) =>
    apiReq<T>('POST', '/devices', { name }),
  renameDevice: <T = unknown>(id: string, name: string) =>
    apiReq<T>('PATCH', `/devices/${id}`, { name }),
  updateTelemetrySettings: <T = unknown>(
    id: string,
    settings: {
      telemetry_cpu?: boolean;
      telemetry_ram?: boolean;
      telemetry_gpu?: boolean;
      telemetry_wifi?: boolean;
    }
  ) => apiReq<T>('PATCH', `/devices/${id}/telemetry-settings`, settings),
  deleteDevice: <T = unknown>(id: string) =>
    apiReq<T>('DELETE', `/devices/${id}`),
  rotateToken: <T = unknown>(id: string) =>
    apiReq<T>('POST', `/devices/${id}/rotate-token`),
  pairCode: <T = unknown>(id: string) =>
    apiReq<T>('POST', `/devices/${id}/pair-code`),
  billingStatus: <T = unknown>() =>
    apiReq<T>('GET', '/billing/status'),
  billingCheckout: <T = unknown>(device_id: string) =>
    apiReq<T>('POST', '/billing/checkout', { device_id }),
  billingPortal: <T = unknown>() =>
    apiReq<T>('POST', '/billing/portal'),
  billingRequests: <T = unknown>() =>
    apiReq<T>('GET', '/billing/requests'),
  sendCommand: <T = unknown>(deviceId: string, type: string) =>
    apiReq<T>('POST', `/commands/${deviceId}`, { type }),
  commands: <T = unknown>(deviceId: string) =>
    apiReq<T>('GET', `/commands/${deviceId}`),
  schedule: <T = unknown>(deviceId: string, type: string, run_at: string) =>
    apiReq<T>('POST', `/commands/${deviceId}/schedule`, { type, run_at }),
  schedules: <T = unknown>(deviceId: string) =>
    apiReq<T>('GET', `/commands/${deviceId}/schedule`),
  cancelSchedule: <T = unknown>(deviceId: string, id: string) =>
    apiReq<T>('DELETE', `/commands/${deviceId}/schedule/${id}`),
  telemetry: <T = unknown>(deviceId: string) =>
    apiReq<T>('GET', `/telemetry/${deviceId}`),
};
