import axios from "axios";

/**
 * Resolve the API base URL:
 *
 * 1. If VITE_API_URL is explicitly set (e.g. "https://my-backend.vercel.app/api"),
 *    use that directly. This is the recommended approach for production when
 *    the backend is on a different domain.
 *
 * 2. If not set, use a relative "/api" path which works when:
 *    - The Vite dev server proxies /api to http://localhost:5000 (local dev)
 *    - Vercel rewrites /api/:path* to the backend (production same-origin proxy)
 *
 * This distinction matters for cookies and CORS:
 *   - Cross-origin (VITE_API_URL set): needs withCredentials: true so cookies
 *     and Authorization headers are sent across origins.
 *   - Same-origin (relative /api): withCredentials is unnecessary and can
 *     actually break things if the backend CORS uses a wildcard origin (*),
 *     since browsers reject withCredentials + Access-Control-Allow-Origin: *.
 */
function resolveBaseURL() {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Strip trailing slash for consistency
    const cleaned = envUrl.replace(/\/+$/, "");

    // Catch the most common misconfiguration: setting the URL to just the
    // domain without the /api suffix. All service calls use paths like
    // "/auth/login", "/analytics/overview", etc. — they expect the base
    // URL to already include "/api".
    if (!cleaned.endsWith("/api")) {
      console.error(
        `[api.js] VITE_API_URL is set to "${envUrl}" but it must end with "/api". ` +
          `Example: "https://your-backend.vercel.app/api". ` +
          `Requests will likely 404 without the /api suffix.`,
      );
    }

    return cleaned;
  }

  return "/api";
}

const API_BASE_URL = resolveBaseURL();

// Determine if we're making cross-origin requests.
// When VITE_API_URL is set, the frontend talks directly to a different domain
// and we need withCredentials so cookies/auth headers are included.
// When using the relative /api path (Vite proxy or Vercel rewrites),
// requests are same-origin and withCredentials must NOT be set to avoid
// conflicts with CORS wildcard origins.
const isCrossOrigin = !!import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: isCrossOrigin,
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

    // Handle CORS / network errors more gracefully
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
