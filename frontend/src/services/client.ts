// services/client.ts
//
// Single Axios instance used by every service file. Injects the JWT access
// token on every request, and on a 401 tries exactly one silent refresh
// before giving up and forcing logout -- avoids infinite refresh loops.

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function getAccessToken(): string | null {
  return localStorage.getItem("fedxplain_access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("fedxplain_refresh_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("fedxplain_access_token", access);
  localStorage.setItem("fedxplain_refresh_token", refresh);
}

export function clearTokens() {
  localStorage.removeItem("fedxplain_access_token");
  localStorage.removeItem("fedxplain_refresh_token");
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry || originalRequest.url?.includes("/auth/")) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve) => {
        pendingQueue.push(() => resolve(apiClient(originalRequest)));
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        params: { refresh_token: refreshToken },
      });
      setTokens(data.access_token, data.refresh_token);
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearTokens();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
