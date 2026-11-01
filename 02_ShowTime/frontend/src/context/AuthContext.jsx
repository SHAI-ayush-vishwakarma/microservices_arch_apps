import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth.api.js";

const TOKEN_KEY = "showtime_token";
const AuthContext = createContext(null);

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(readStoredToken()));

  // On app start (or token change): ask the gateway who this token belongs to
  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    authApi
      .getMe(token)
      .then(setUser)
      .catch(() => logout())          // expired / invalid token → log out
      .finally(() => setIsLoading(false));
  }, [token]);

  async function login(credentials) {
    const result = await authApi.login(credentials);
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const value = { token, user, isLoading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
