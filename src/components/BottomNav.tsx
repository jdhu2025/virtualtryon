"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, MessageCircle, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth-local";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/wardrobe", icon: Shirt, label: "衣柜" },
  { href: "/chat", icon: MessageCircle, label: "穿搭" },
  { href: "/history", icon: History, label: "历史" },
  { href: "/profile", icon: User, label: "我的", requiresAuth: true },
];

export function BottomNav() {
  const pathname = usePathname();
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "h-5 w-5")} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
