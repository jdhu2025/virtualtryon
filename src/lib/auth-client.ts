"use client";

import { useState, useEffect, useCallback } from "react";
import {
  logoutUser as localLogout,
  getCurrentUser,
  clearUserData,
  setCurrentUser,
} from "@/lib/auth-local";

interface UserWithoutPassword {
  id: string;
  username: string;
  createdAt?: string;
  created_at?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserWithoutPassword;
}

/**
 * 客户端注册函数
 */
export async function clientRegister(
  username: string,
  password: string,
  agreePrivacy: boolean
): Promise<AuthResult> {
  if (!agreePrivacy) {
    return { success: false, error: "请阅读并同意隐私政策" };
  }

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, agreePrivacy }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "注册失败" };
    }

    if (data.user) {
      setCurrentUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("user-login"));
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error("注册请求失败:", error);
    return {
      success: false,
      error: "无法连接服务，请确认本地开发服务已启动；如果刚修改过 .env.local，请重启 pnpm dev",
    };
  }
}

/**
 * 客户端登录函数
 */
export async function clientLogin(
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "登录失败" };
    }

    if (data.user) {
      setCurrentUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("user-login"));
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error("登录请求失败:", error);
    return {
      success: false,
      error: "无法连接服务，请确认本地开发服务已启动；如果刚修改过 .env.local，请重启 pnpm dev",
    };
  }
}

/**
 * 客户端退出登录函数
 */
export async function clientLogout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("退出登录请求失败:", error);
  }

  localLogout();
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("user-logout"));
}

/**
 * 清除用户数据
 */
export async function clientClearUserData(userId: string): Promise<void> {
  try {
    // 清除服务端数据（如果配置了）
    await fetch("/api/clear-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch (error) {
    console.error("清除数据请求失败:", error);
  }
}

/**
 * React Hook 用于管理认证状态
 */
export function useAuth() {
  const [user, setUser] = useState<UserWithoutPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    const init = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }

      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          setUser(data.user);
        } else {
          localLogout();
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch {
        setUser(currentUser);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // 登录
  const login = useCallback(async (username: string, password: string) => {
    const result = await clientLogin(username, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  // 注册
  const register = useCallback(async (
    username: string,
    password: string,
    agreePrivacy: boolean
  ) => {
    const result = await clientRegister(username, password, agreePrivacy);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  }, []);

  // 退出登录
  const logout = useCallback(() => {
    clientLogout();
    setUser(null);
  }, []);

  // 清除数据
  const clearData = useCallback(async (userId: string) => {
    await clientClearUserData(userId);
    clearUserData(userId);
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    clearData,
  };
}
