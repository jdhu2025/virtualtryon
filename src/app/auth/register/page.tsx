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

export default function RegisterPage() {
  const router = useRouter();
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

    // 验证用户名
    if (!username) {
      newErrors.username = "请输入用户名";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      newErrors.username = "用户名需为3-20位字母、数字或下划线";
    }

    // 验证密码
    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6 || password.length > 20) {
      newErrors.password = "密码需为6-20位";
    }

    // 验证确认密码
    if (!confirmPassword) {
      newErrors.confirmPassword = "请再次输入密码";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "两次输入的密码不一致";
    }

    // 验证隐私政策
    if (!agreePrivacy) {
      newErrors.privacy = "请阅读并同意隐私政策";
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
      const result = await clientRegister(username, password, agreePrivacy);

      if (!result.success || !result.user) {
        throw new Error(result.error || "注册失败");
      }

      toast.success("注册成功！");

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("注册错误:", error);
      toast.error(error instanceof Error ? error.message : "注册失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">创建账号</CardTitle>
          <CardDescription className="text-center">
            加入 AI 穿搭助手，开启你的时尚之旅
          </CardDescription>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              先回官网看看
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
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
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码（6-20位）"
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
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
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
                    我已阅读并同意{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      隐私政策
                    </Link>{" "}
                    与{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      服务条款
                    </Link>
                  </Label>
                  {errors.privacy && (
                    <p className="text-sm text-red-500">{errors.privacy}</p>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-600 pl-6 space-y-1">
                <p>1. 我理解我的穿搭数据（头像、衣服照片）将安全存储在云端。</p>
                <p>2. 我理解我的数据将与我的账号关联，他人无法访问我的私人数据。</p>
                <p>3. 我理解我可以随时清除自己的数据，系统会删除所有与我相关的信息。</p>
                <p>4. 我理解在不同浏览器或设备上需要重新登录以访问我的数据。</p>
                <p>5. 我同意遵守社区规范，不上传侵犯他人隐私的内容。</p>
                <p>
                  购买后如需了解退款说明，可查看{" "}
                  <Link href="/refund" className="text-primary hover:underline">
                    退款政策
                  </Link>
                  。
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                "注册"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            已有账号？{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
