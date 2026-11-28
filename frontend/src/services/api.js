import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_URL
});

// Attach JWT Bearer token to every outgoing request when available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('archive_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Clear stale local session if a protected endpoint returns 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    if (error?.response?.status === 401 && !isAuthAttempt) {
      window.dispatchEvent(new Event('auth:expired'));
    }

    return Promise.reject(error);
  }
);

/**
 * Resolves a stored relative upload path (e.g. /uploads/file.pdf) into a full URL.
 */
export const buildFileUrl = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

/**
 * Extracts a readable error message from an Axios error response.
 */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export default api;
