import axios from "axios";

/**
 * Resolve the API base URL:
 *
 * 1. If VITE_API_URL is explicitly set (e.g. "https://my-backend.vercel.app/api"),
 *    use that directly. This is the recommended approach for production.
 *
 * 2. If not set, check if we're in production (on Vercel). In that case, we
 *    cannot fall back to localhost — instead, warn and use a relative "/api"
 *    path which will only work if the backend is on the same domain.
 *
 * 3. In local development, fall back to the Vite dev server proxy ("/api"),
 *    which proxies to http://localhost:5000/api via vite.config.js.
 */
function resolveBaseURL() {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Strip trailing slash for consistency
    return envUrl.replace(/\/+$/, "");
  }

  // In production without an explicit URL, use relative path.
  // This works if:
  //  - Backend and frontend share the same domain (reverse proxy), OR
  //  - Vercel rewrites are configured to proxy /api to the backend
  // In dev, the Vite proxy handles /api -> localhost:5000/api
  return "/api";
}

const API_BASE_URL = resolveBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  // Send cookies cross-origin (needed when frontend and backend are
  // on different Vercel subdomains or different domains entirely)
  withCredentials: true,
});

// Request interceptor — attach JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor — handle auth failures gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      // Don't redirect to login if the 401 came from the verify/me endpoints —
      // those are expected to fail when there's no valid session, and the
      // AuthContext handles that case internally.
      const isAuthCheck =
        requestUrl.includes("/auth/verify") || requestUrl.includes("/auth/me");

      if (!isAuthCheck) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Only redirect if we're not already on the login/signup/landing pages
        const path = window.location.pathname;
        const publicPaths = [
          "/login",
          "/signup",
          "/",
          "/forgot-password",
          "/reset-password",
        ];
        const isPublicPage = publicPaths.some(
          (p) => path === p || path.startsWith("/reset-password"),
        );

        if (!isPublicPage) {
          window.location.href = "/login";
        }
      }
    }

    // Handle CORS errors more gracefully
    if (!error.response && error.message === "Network Error") {
      console.error(
        "Network Error: This may be a CORS issue. " +
          "Ensure the backend CORS config includes this origin: " +
          window.location.origin,
      );
    }

    return Promise.reject(error);
  },
);

export default api;
