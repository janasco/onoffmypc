const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://api.onoffmypc.com';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  status?: number;
}

async function apiReq<T = any>(
  method: string,
  path: string,
  body?: any
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

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: data.error || 'request failed',
        code: data.code,
        status: res.status,
      };
    }
    return { data };
  } catch (err) {
    return { error: 'network error' };
  }
}

export const api = {
  login: (email: string, password: string, turnstile_token?: string) =>
    apiReq('POST', '/auth/login', { email, password, turnstile_token }),
  googleAuth: (credential: string) =>
    apiReq('POST', '/auth/google', { credential }),
  appleAuth: (credential: string) =>
    apiReq('POST', '/auth/apple', { credential }),
  microsoftAuth: (credential: string) =>
    apiReq('POST', '/auth/microsoft', { credential }),
  register: (email: string, password: string, invite_code?: string, turnstile_token?: string) =>
    apiReq('POST', '/auth/register', { email, password, invite_code, turnstile_token }),
  registrationStatus: () =>
    apiReq('GET', '/auth/registration-status'),
  joinWaitlist: (email: string) =>
    apiReq('POST', '/waitlist', { email }),
  logout: () =>
    apiReq('POST', '/auth/logout'),
  me: () =>
    apiReq('GET', '/auth/me'),
  exportData: () =>
    apiReq('GET', '/auth/export'),
  deleteAccount: () =>
    apiReq('DELETE', '/auth/account'),
  cancelDeletion: () =>
    apiReq('POST', '/auth/account/cancel-deletion'),
  forgotPassword: (email: string) =>
    apiReq('POST', '/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiReq('POST', '/auth/reset-password', { token, password }),
  verifyEmail: (token: string) =>
    apiReq('GET', `/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerify: () =>
    apiReq('POST', '/auth/resend-verify'),
  changePassword: (current_password: string, new_password: string) =>
    apiReq('POST', '/auth/change-password', { current_password, new_password }),
  changeEmail: (new_email: string, password: string) =>
    apiReq('POST', '/auth/change-email', { new_email, password }),
  devices: () =>
    apiReq('GET', '/devices'),
  getDevice: (id: string) =>
    apiReq('GET', `/devices/${id}`),
  deviceStatus: (id: string) =>
    apiReq('GET', `/devices/${id}/status`),
  history: (id: string, days = 7) =>
    apiReq('GET', `/telemetry/${id}/history?days=${days}`),
  addDevice: (name: string) =>
    apiReq('POST', '/devices', { name }),
  renameDevice: (id: string, name: string) =>
    apiReq('PATCH', `/devices/${id}`, { name }),
  updateTelemetrySettings: (
    id: string,
    settings: {
      telemetry_cpu?: boolean;
      telemetry_ram?: boolean;
      telemetry_gpu?: boolean;
      telemetry_wifi?: boolean;
    }
  ) => apiReq('PATCH', `/devices/${id}/telemetry-settings`, settings),
  deleteDevice: (id: string) =>
    apiReq('DELETE', `/devices/${id}`),
  rotateToken: (id: string) =>
    apiReq('POST', `/devices/${id}/rotate-token`),
  pairCode: (id: string) =>
    apiReq('POST', `/devices/${id}/pair-code`),
  billingStatus: () =>
    apiReq('GET', '/billing/status'),
  billingCheckout: (device_id: string) =>
    apiReq('POST', '/billing/checkout', { device_id }),
  billingPortal: () =>
    apiReq('POST', '/billing/portal'),
  billingRequests: () =>
    apiReq('GET', '/billing/requests'),
  sendCommand: (deviceId: string, type: string) =>
    apiReq('POST', `/commands/${deviceId}`, { type }),
  commands: (deviceId: string) =>
    apiReq('GET', `/commands/${deviceId}`),
  schedule: (deviceId: string, type: string, run_at: string) =>
    apiReq('POST', `/commands/${deviceId}/schedule`, { type, run_at }),
  schedules: (deviceId: string) =>
    apiReq('GET', `/commands/${deviceId}/schedule`),
  cancelSchedule: (deviceId: string, id: string) =>
    apiReq('DELETE', `/commands/${deviceId}/schedule/${id}`),
  telemetry: (deviceId: string) =>
    apiReq('GET', `/telemetry/${deviceId}`),
};
