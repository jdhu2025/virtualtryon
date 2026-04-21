"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { clientLogin } from "@/lib/auth-client";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!username) {
      newErrors.username = t(locale, "Please enter your username.", "请输入用户名");
    }

    if (!password) {
      newErrors.password = t(locale, "Please enter your password.", "请输入密码");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await clientLogin(username, password, locale);

      if (!result.success || !result.user) {
        throw new Error(result.error || t(locale, "Login failed.", "登录失败"));
      }

      toast.success(t(locale, "Welcome back.", "登录成功！"));

      // 跳转到首页
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("登录错误:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t(locale, "Login failed. Please try again.", "登录失败，请稍后重试")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-end px-6 pt-6">
          <LanguageSwitcher compact />
        </div>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t(locale, "Welcome back", "欢迎回来")}
          </CardTitle>
          <CardDescription className="text-center">
            {t(locale, "Sign in to your AI Outfit Assistant account.", "登录你的 AI 穿搭助手账号")}
          </CardDescription>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              {t(locale, "Back to the homepage", "返回官网首页")}
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t(locale, "Username", "用户名")}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t(locale, "Enter your username", "请输入用户名")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t(locale, "Password", "密码")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t(locale, "Enter your password", "请输入密码")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(locale, "Signing in...", "登录中...")}
                </>
              ) : (
                t(locale, "Log in", "登录")
              )}
            </Button>

            <p className="text-center text-xs leading-6 text-gray-500">
              {t(locale, "By signing in you continue using the service and can review the ", "登录即表示你继续使用本服务，并可随时查看")}
              <Link href="/terms" className="text-primary hover:underline">
                {t(locale, "Terms of Service", "服务条款")}
              </Link>
              {locale === "zh" ? "、" : ", "}
              <Link href="/privacy" className="text-primary hover:underline">
                {t(locale, "Privacy Policy", "隐私政策")}
              </Link>
              {t(locale, " and ", "与")}
              <Link href="/refund" className="text-primary hover:underline">
                {t(locale, "Refund Policy", "退款政策")}
              </Link>
              {locale === "zh" ? "。" : "."}
            </p>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            {t(locale, "Don't have an account yet? ", "还没有账号？")}
            <Link href="/auth/register" className="text-primary hover:underline font-medium">
              {t(locale, "Create one", "立即注册")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
