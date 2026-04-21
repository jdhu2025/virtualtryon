"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { clientRegister } from "@/lib/auth-client";
import { useLocale } from "@/contexts/locale-context";
import { useTurnstile } from "@/contexts/turnstile-context";
import { t } from "@/lib/locale";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function RegisterPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { getToken } = useTurnstile();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    privacy?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!username) {
      newErrors.username = t(locale, "Please enter a username.", "请输入用户名");
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      newErrors.username = t(
        locale,
        "Username must be 3-20 characters and use only letters, numbers, or underscores.",
        "用户名需为3-20位字母、数字或下划线"
      );
    }

    if (!password) {
      newErrors.password = t(locale, "Please enter a password.", "请输入密码");
    } else if (password.length < 6 || password.length > 20) {
      newErrors.password = t(
        locale,
        "Password must be 6-20 characters long.",
        "密码需为6-20位"
      );
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t(locale, "Please confirm your password.", "请再次输入密码");
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t(
        locale,
        "The passwords do not match.",
        "两次输入的密码不一致"
      );
    }

    if (!agreePrivacy) {
      newErrors.privacy = t(
        locale,
        "Please review and accept the privacy policy.",
        "请阅读并同意隐私政策"
      );
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
      const turnstileToken = await getToken();
      const result = await clientRegister(username, password, agreePrivacy, {
        locale,
        turnstileToken,
      });

      if (!result.success || !result.user) {
        throw new Error(result.error || t(locale, "Registration failed.", "注册失败"));
      }

      toast.success(t(locale, "Account created.", "注册成功！"));

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("注册错误:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t(locale, "Registration failed. Please try again.", "注册失败，请稍后重试")
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
            {t(locale, "Create your account", "创建账号")}
          </CardTitle>
          <CardDescription className="text-center">
            {t(
              locale,
              "Join AI Outfit Assistant and start styling with what you already own.",
              "加入 AI 穿搭助手，开启你的时尚之旅"
            )}
          </CardDescription>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              {t(locale, "Back to the homepage", "先回官网看看")}
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
                placeholder={t(locale, "Choose a username", "请输入用户名")}
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
                placeholder={t(locale, "Create a password (6-20 chars)", "请输入密码（6-20位）")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t(locale, "Confirm password", "确认密码")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t(locale, "Enter the password again", "请再次输入密码")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
            
            {/* 隐私政策勾选 */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="privacy"
                  checked={agreePrivacy}
                  onCheckedChange={(checked) => setAgreePrivacy(checked === true)}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="privacy"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t(locale, "I have read and agree to the ", "我已阅读并同意")}
                    <Link href="/privacy" className="text-primary hover:underline">
                      {t(locale, "Privacy Policy", "隐私政策")}
                    </Link>{" "}
                    {t(locale, "and ", "与")}
                    <Link href="/terms" className="text-primary hover:underline">
                      {t(locale, "Terms of Service", "服务条款")}
                    </Link>
                  </Label>
                  {errors.privacy && (
                    <p className="text-sm text-red-500">{errors.privacy}</p>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600 pl-6 space-y-1">
                <p>{t(locale, "1. I understand that my outfit data, portraits, and clothing photos will be stored securely in the cloud.", "1. 我理解我的穿搭数据（头像、衣服照片）将安全存储在云端。")}</p>
                <p>{t(locale, "2. I understand that my data is tied to my account and is not accessible to other users.", "2. 我理解我的数据将与我的账号关联，他人无法访问我的私人数据。")}</p>
                <p>{t(locale, "3. I understand that I can clear my data at any time, and the system will remove information linked to me.", "3. 我理解我可以随时清除自己的数据，系统会删除所有与我相关的信息。")}</p>
                <p>{t(locale, "4. I understand that I need to log in again on another browser or device to access my data.", "4. 我理解在不同浏览器或设备上需要重新登录以访问我的数据。")}</p>
                <p>{t(locale, "5. I agree to follow community rules and not upload content that violates other people's privacy.", "5. 我同意遵守社区规范，不上传侵犯他人隐私的内容。")}</p>
                <p>
                  {t(locale, "For refund details after purchase, please review the ", "购买后如需了解退款说明，可查看")}
                  <Link href="/refund" className="text-primary hover:underline">
                    {t(locale, "Refund Policy", "退款政策")}
                  </Link>
                  {locale === "zh" ? "。" : "."}
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t(locale, "Creating account...", "注册中...")}
                </>
              ) : (
                t(locale, "Create account", "注册")
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            {t(locale, "Already have an account? ", "已有账号？")}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              {t(locale, "Log in", "立即登录")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
