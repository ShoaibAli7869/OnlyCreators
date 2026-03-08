import { createContext, useState, useCallback, useEffect, useRef } from "react";
import api from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Track whether the initial auth check is in progress to prevent
  // the api interceptor from redirecting to /login during verification
  const isVerifying = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        // Optimistically set the cached user so the UI doesn't flash
        // a logged-out state while we verify the token
        try {
          const cached = JSON.parse(storedUser);
          setUser(cached);
          setIsAuthenticated(true);
        } catch {
          // Invalid JSON in storage, ignore
        }

        isVerifying.current = true;
        try {
          // Verify token with backend
          const response = await api.get("/auth/verify");
          if (response.data.success) {
            const userData = response.data.data;
            setUser(userData);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(userData));
          } else {
            // Token invalid, clear storage
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch (error) {
          // If verify fails (e.g., server down), still use stored user for offline-ish mode
          // but if it's a 401, clear everything
          if (error.response && error.response.status === 401) {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
          // For network errors / CORS errors / 5xx, keep using cached user
          // so the app doesn't boot the user out when the backend is momentarily down
        } finally {
          isVerifying.current = false;
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });

      if (response.data.success) {
        const { token, user: userData } = response.data;

        // Store token and user in localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      setIsLoading(false);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Invalid email or password. Please try again.";
      throw new Error(message);
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      if (response.data.success) {
        const { token, user: userData } = response.data;

        // Store token and user in localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        throw new Error(response.data.message || "Signup failed");
      }
    } catch (error) {
      setIsLoading(false);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to create account. Please try again.";
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    // Immediately clear local state so the UI updates right away
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      // Call backend logout endpoint to clear the httpOnly cookie
      await api.post("/auth/logout");
    } catch (error) {
      // Even if the API call fails, local state is already cleared
      console.warn("Logout API call failed:", error.message);
    }
  }, []);

  const updateUser = useCallback(async (updates) => {
    try {
      const response = await api.put("/auth/update-profile", updates);

      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return { success: true, data: updatedUser };
      }
    } catch (error) {
      // Fall back to local update if API fails
      console.warn(
        "Profile update API call failed, updating locally:",
        error.message,
      );
      setUser((prev) => {
        const updated = { ...prev, ...updates };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isVerifying,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
