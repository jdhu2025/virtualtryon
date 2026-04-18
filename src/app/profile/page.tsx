"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { ImageSourceSheet } from "@/components/image-source-sheet";
import { toast } from "sonner";
import { Loader2, LogOut, Trash2, Shield, Plus, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { getCurrentUser, clearUserData } from "@/lib/auth-local";
import { clientLogout } from "@/lib/auth-client";

interface Portrait {
  id: string;
  avatar_url: string;
  nickname: string;
  user_id: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const portraitLibraryInputRef = useRef<HTMLInputElement>(null);
  const portraitCameraInputRef = useRef<HTMLInputElement>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPortraitPicker, setShowPortraitPicker] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadUserAndPortraits();
    };
    init();
  }, []);

  const loadUserAndPortraits = async () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      try {
        const response = await fetch("/api/portraits");
        if (response.ok) {
          const data = await response.json();
          setPortraits(data.portraits || []);
        }
      } catch (e) {
        console.error("加载人像失败:", e);
      }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await clientLogout();
    toast.success("已退出登录");
    router.push("/auth/login");
  };

  const handleClearData = async () => {
    if (!user) return;

    setIsClearing(true);
    try {
      const response = await fetch("/api/clear-data", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "清除数据失败");
      }

      clearUserData(user.id);
      toast.success("个人数据已清除");
      setShowClearConfirm(false);
      await clientLogout();
      setTimeout(() => {
        router.push("/auth/login");
      }, 1000);
    } catch (error) {
      console.error("清除数据失败:", error);
      toast.error("清除数据失败，请稍后重试");
    } finally {
      setIsClearing(false);
    }
  };

  const handlePortraitUploadFile = async (file: File) => {
    if (!file || !user) return;

    // 验证文件类型和大小
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("图片大小不能超过 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // 转换为 base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          
          // 调用上传 API
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64,
              category: "avatars",
              userId: user.id,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "上传失败");
          }

          const result = await response.json();

          const saveResponse = await fetch("/api/portraits", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              avatarPath: result.url,
              nickname: `人像 ${portraits.length + 1}`,
            }),
          });

          const saveData = await saveResponse.json();
          if (!saveResponse.ok) {
            throw new Error(saveData.error || "保存人像失败");
          }

          setPortraits((prev) => [saveData.portrait, ...prev]);
          
          toast.success("人像上传成功");
        } catch (uploadError) {
          console.error("上传到云端失败:", uploadError);
          toast.error(
            uploadError instanceof Error
              ? uploadError.message
              : "人像上传失败，请稍后重试"
          );
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("人像上传失败:", error);
      toast.error("人像上传失败，请重试");
      setIsUploading(false);
    }
  };

  const handlePortraitUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      void handlePortraitUploadFile(file);
    }
  };

  const openPortraitPicker = () => {
    if (!isUploading) {
      setShowPortraitPicker(true);
    }
  };

  const handleDeletePortrait = async (portraitId: string) => {
    if (!user) return;

    setDeletingId(portraitId);
    try {
      const response = await fetch(`/api/portraits?id=${portraitId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "删除失败");
      }
      setPortraits(prev => prev.filter(p => p.id !== portraitId));
      toast.success("人像已删除");
    } catch (error) {
      console.error("删除人像失败:", error);
      toast.error("删除人像失败，请稍后重试");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>登录后可查看个人资料</CardTitle>
            <CardDescription>
              登录后你可以管理个人资料、查看穿搭历史
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/auth/login">
              <Button className="w-full">登录</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full">注册</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-8 text-white">
        <h1 className="text-2xl font-bold text-center">个人资料</h1>
        <p className="text-center text-pink-100 mt-1">{user.username}</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* 人像管理卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5 text-pink-600" />
              我的人像照片
            </CardTitle>
            <CardDescription>
              上传多个人像照片，AI 会根据这些照片为你生成更贴合的穿搭效果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 添加入口 */}
            <div>
              <button
                type="button"
                onClick={openPortraitPicker}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">上传中...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-pink-600" />
                    </div>
                    <span className="text-sm text-gray-600">点击添加上传人像</span>
                  </div>
                )}
              </button>
            </div>

            {/* 人像列表 */}
            {portraits.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-3">已上传 {portraits.length} 个人像</p>
                <div className="grid grid-cols-3 gap-3">
                  {portraits.map((portrait) => (
                    <div key={portrait.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <img
                          src={portrait.avatar_url}
                          alt={portrait.nickname}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => handleDeletePortrait(portrait.id)}
                        disabled={deletingId === portrait.id}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        {deletingId === portrait.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{portrait.nickname}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 空状态提示 */}
            {portraits.length === 0 && !isUploading && (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">还没有人像照片</p>
                <p className="text-xs text-gray-400 mt-1">上传人像后，AI 生成的穿搭效果会更贴合你</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 隐私设置卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-green-600" />
              数据隐私设置
            </CardTitle>
            <CardDescription>管理你的个人数据和隐私</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-800 font-medium">关于人像照片</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>✓ 你的人像照片将存储在云端对象存储中</li>
                <li>✓ 在 AI 生成穿搭时会作为参考图片使用</li>
                <li>✓ 支持上传多个人像，AI 会综合参考</li>
                <li>✓ 只有你可以访问和管理自己的照片</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-green-800 font-medium">数据保护</p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>✓ 你的穿搭数据与账号安全关联</li>
                <li>✓ 他人无法访问你的私人数据</li>
                <li>✓ 你可以随时清除所有个人数据</li>
              </ul>
            </div>

            {/* 清除数据按钮 */}
            {!showClearConfirm ? (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清除个人数据
              </Button>
            ) : (
              <div className="border border-red-200 rounded-lg p-4 space-y-3 bg-red-50">
                <p className="text-sm text-red-800 font-medium">确认清除数据</p>
                <p className="text-xs text-red-600">
                  此操作将删除所有与你相关的数据，包括：
                </p>
                <ul className="text-xs text-red-600 list-disc list-inside">
                  <li>个人资料信息（含所有人像）</li>
                  <li>衣柜中的所有衣服</li>
                  <li>穿搭推荐历史</li>
                  <li>所有收藏和反馈</li>
                </ul>
                <p className="text-xs text-red-600 font-medium">
                  此操作不可撤销！
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                    disabled={isClearing}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="flex-1"
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        清除中...
                      </>
                    ) : (
                      "确认清除"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 退出登录 */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </Button>
      </div>
      <input
        ref={portraitLibraryInputRef}
        type="file"
        accept="image/*"
        onChange={handlePortraitUpload}
        className="hidden"
        disabled={isUploading}
      />
      <input
        ref={portraitCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handlePortraitUpload}
        className="hidden"
        disabled={isUploading}
      />
      <input
        ref={portraitFileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handlePortraitUpload}
        className="hidden"
        disabled={isUploading}
      />
      <ImageSourceSheet
        open={showPortraitPicker}
        title="添加人像照片"
        description="你可以从手机图库选择、直接拍照，或从文件中导入。"
        onClose={() => setShowPortraitPicker(false)}
        onChooseLibrary={() => portraitLibraryInputRef.current?.click()}
        onChooseCamera={() => portraitCameraInputRef.current?.click()}
        onChooseFile={() => portraitFileInputRef.current?.click()}
      />
      <BottomNav />
    </div>
  );
}
