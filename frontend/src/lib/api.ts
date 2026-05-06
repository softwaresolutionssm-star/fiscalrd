import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Send active branch filter header for owner branch switching
    const user = (() => { try { return JSON.parse(localStorage.getItem('user') ?? '{}'); } catch { return {}; } })();
    if (user.role === 'owner') {
      const savedBranch = localStorage.getItem(`activeBranch_${user.tenantId}`);
      if (savedBranch && savedBranch !== 'all') {
        config.headers['X-Branch-Filter'] = savedBranch;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only redirect to login on 401 if the user had an active session (token exists)
    // Never redirect if we're already on the login or forgot-password pages
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const onAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/forgot-password') || window.location.pathname.startsWith('/reset-password');
      const hasToken = !!localStorage.getItem('token');
      if (hasToken && !onAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
