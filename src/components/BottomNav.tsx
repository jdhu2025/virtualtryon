"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth-local";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/language-switcher";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  requiresAuth?: boolean;
}

interface BottomNavProps {
  compact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", icon: Home, label: "home" },
  { href: "/wardrobe", icon: Shirt, label: "wardrobe" },
  { href: "/chat", icon: MessageCircle, label: "stylist" },
  { href: "/profile", icon: User, label: "profile", requiresAuth: true },
];

export function BottomNav({ compact = false }: BottomNavProps) {
  const pathname = usePathname();
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 检查登录状态
    const user = getCurrentUser();
    setIsLoggedIn(!!user);
    
    // 监听 localStorage 变化
    const handleStorageChange = () => {
      const user = getCurrentUser();
      setIsLoggedIn(!!user);
    };
    
    window.addEventListener("storage", handleStorageChange);
    // 也监听自定义事件（用于同页面状态更新）
    window.addEventListener("user-login", handleStorageChange);
    window.addEventListener("user-logout", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("user-login", handleStorageChange);
      window.removeEventListener("user-logout", handleStorageChange);
    };
  }, []);

  // 过滤需要登录的菜单项
  const visibleItems = navItems.filter(item => {
    if (item.requiresAuth && mounted && !isLoggedIn) {
      return false;
    }
    return true;
  });

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 px-3",
        compact ? "z-40" : "z-50"
      )}
      style={{ paddingBottom: compact ? "max(10px, env(safe-area-inset-bottom))" : "max(12px, env(safe-area-inset-bottom))" }}
    >
      <nav
        className={cn(
          "glass-dock pointer-events-auto mx-auto rounded-[30px] px-3",
          compact ? "max-w-3xl py-2.5" : "max-w-xl py-3"
        )}
      >
        {!compact ? (
          <div className="mb-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#74619a]">
              <span className="h-2 w-2 rounded-full bg-[#de6f8e] shadow-[0_0_18px_rgba(222,111,142,0.8)]" />
              {t(locale, "Closet Flow", "衣橱动线")}
            </div>
            <LanguageSwitcher
              compact
              className="border-white/60 bg-white/70 shadow-none"
            />
          </div>
        ) : null}

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group rounded-[24px] px-2 transition-all duration-300",
                  compact ? "py-2.5" : "py-3",
                  isActive
                    ? "bg-[#20183a] text-white shadow-[0_16px_36px_rgba(32,24,58,0.28)]"
                    : "text-[#7c6e88] hover:bg-white/70 hover:text-[#2a2146]"
                )}
              >
                <div className={cn("flex flex-col items-center text-center", compact ? "gap-1" : "gap-1.5")}>
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-300",
                      compact ? "h-9 w-9" : "h-10 w-10",
                      isActive
                        ? "bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.26)]"
                        : "bg-white/72 group-hover:bg-white"
                    )}
                  >
                    <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                  </div>
                  <span className={cn("font-medium", compact ? "text-[10px]" : "text-[11px]")}>
                    {item.label === "home"
                      ? t(locale, "Home", "首页")
                      : item.label === "wardrobe"
                        ? t(locale, "Wardrobe", "衣柜")
                        : item.label === "stylist"
                          ? t(locale, "Stylist", "穿搭")
                          : t(locale, "Profile", "我的")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
