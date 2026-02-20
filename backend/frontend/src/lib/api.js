import axios from "axios";
import { clearToken, getToken } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }

    return Promise.reject(error);
  }
);

export function extractApiError(error, fallbackMessage) {
  if (!error?.response) {
    return "Cannot reach backend API. Start backend on http://localhost:5000.";
  }

  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data?.message === "string") {
    return data.details ? `${data.message} (${data.details})` : data.message;
  }

  return fallbackMessage;
}

export function shouldFallbackToDemo(error) {
  if (!error?.response) {
    return true;
  }

  const status = Number(error?.response?.status || 0);
  const data = error?.response?.data;
  const rawMessage =
    (typeof data?.message === "string" ? data.message : "") +
    " " +
    (typeof data?.details === "string" ? data.details : "");
  const message = rawMessage.toLowerCase();

  if (status === 429) return true;
  if (status === 401) return true;

  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("insufficient_quota") ||
    message.includes("billing") ||
    message.includes("openai")
  );
}

export default api;
