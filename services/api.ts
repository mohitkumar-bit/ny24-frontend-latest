import axios from 'axios';
import { Platform } from 'react-native';
import { tokenStorage } from './tokenStorage';
import { forceLogout, shouldSkipTokenRefresh } from './authSession';

export const BASE_URL = __DEV__
  ? 'http://localhost:4000/api'
  : 'https://api.gigseva.com/api';

export function getPlayableVideoUrl(jobId: string) {
  return `${BASE_URL}/job/${jobId}/video-stream`;
}

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    // Required for free ngrok so browser/device doesn't get the HTML warning page
    'ngrok-skip-browser-warning': 'true',
  },
});

let refreshInFlight: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('NO_REFRESH_TOKEN');
    }

    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    );
    const newAccessToken = res.data.accessToken as string;
    await tokenStorage.setTokens(newAccessToken, refreshToken);
    return newAccessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function parseFetchJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/** Native-safe multipart upload — fetch keeps Authorization + FormData reliable on Android. */
export async function postMultipart<T = unknown>(
  path: string,
  buildFormData: () => Promise<FormData> | FormData
): Promise<T> {
  const send = async (accessToken: string) => {
    const formData = await buildFormData();
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      body: formData,
    });
  };

  let accessToken = await tokenStorage.getAccessToken();
  if (!accessToken) {
    await forceLogout();
    throw new Error('Not authenticated');
  }

  let response = await send(accessToken);

  if (response.status === 401) {
    try {
      accessToken = await refreshAccessToken();
      response = await send(accessToken);
    } catch {
      await forceLogout();
      throw new Error('Session expired');
    }
  }

  const data = await parseFetchJson(response);

  if (!response.ok) {
    const error: any = new Error(data?.message || 'Upload failed');
    error.response = { status: response.status, data };
    throw error;
  }

  return data as T;
}

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let the browser/RN set multipart boundary — default json Content-Type breaks uploads.
  if (config.data instanceof FormData && config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';
    const errorCode = error.response?.data?.code;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 403 is used for business rules (chat limits, permissions) — not session expiry.
    if (status !== 401) {
      return Promise.reject(error);
    }

    // Login/register wrong credentials etc. — do not logout
    if (shouldSkipTokenRefresh(requestUrl)) {
      return Promise.reject(error);
    }

    if (errorCode === 'SESSION_REVOKED') {
      await forceLogout('session_replaced');
      return Promise.reject(error);
    }

    // Already tried refresh — session is dead (expired), not necessarily replaced
    if (originalRequest._retry) {
      await forceLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // RN FormData is consumed on the first request; rebuild before retrying uploads.
      const uploadMeta = originalRequest._nativeUploadMeta;
      if (uploadMeta) {
        const formData = new FormData();
        formData.append('media', {
          uri: uploadMeta.uri,
          type: uploadMeta.mimeType,
          name: uploadMeta.filename,
        } as any);
        originalRequest.data = formData;
      }

      return api(originalRequest);
    } catch {
      await forceLogout();
      return Promise.reject(error);
    }
  }
);
