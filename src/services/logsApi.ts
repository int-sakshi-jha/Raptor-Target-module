import axios, { type InternalAxiosRequestConfig } from "axios";
import { store } from "@/store";
import { clearAuth } from "@/store/authSlice";

/** Base URL for the Go logs service (no path). Default matches local LAN. */
const LOGS_API_BASE =
  import.meta.env.VITE_LOGS_API_URL ?? "http://192.168.2.68:8080";

export const logsApi = axios.create({
  baseURL: LOGS_API_BASE,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

logsApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

logsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(clearAuth());
    }
    return Promise.reject(error);
  },
);
