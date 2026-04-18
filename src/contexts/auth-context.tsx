"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrentUser, logoutUser as localLogout } from "@/lib/auth-local";

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初始化时检查用户登录状态
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);

    // 监听登录/登出事件
    const handleLogin = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    };

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener("user-login", handleLogin);
    window.addEventListener("user-logout", handleLogout);

    return () => {
      window.removeEventListener("user-login", handleLogin);
      window.removeEventListener("user-logout", handleLogout);
    };
  }, []);

  const logout = () => {
    localLogout();
    // 触发登出事件
    window.dispatchEvent(new Event("user-logout"));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
