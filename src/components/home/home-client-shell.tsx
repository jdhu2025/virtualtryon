"use client";

import { useEffect, useState, type ReactNode } from "react";

import { LoggedInHome } from "@/components/home/logged-in-home";
import { getCurrentUser } from "@/lib/auth-local";
import type { Locale } from "@/lib/locale";

interface HomeClientShellProps {
  children: ReactNode;
  locale: Locale;
}

export function HomeClientShell({ children, locale }: HomeClientShellProps) {
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadUserData() {
      try {
        const user = getCurrentUser();
        if (!isActive) return;

        setIsLoggedIn(Boolean(user));

        if (!user) {
          setWardrobeCount(0);
          return;
        }

        const response = await fetch("/api/wardrobe");
        if (!isActive) return;

        if (response.ok) {
          const data = await response.json();
          setWardrobeCount((data.items || []).length);
        } else {
          setWardrobeCount(0);
        }
      } catch (error) {
        console.error("加载用户数据失败:", error);
      } finally {
        if (isActive) {
          setIsCheckingUser(false);
        }
      }
    }

    void loadUserData();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoggedIn) {
    return (
      <LoggedInHome
        wardrobeCount={wardrobeCount}
        isLoading={isCheckingUser}
        locale={locale}
      />
    );
  }

  return <>{children}</>;
}
