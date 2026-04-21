"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, Database, Cloud, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { clearAllData } from "@/lib/indexeddb";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";

// 客户端挂载状态 Hook
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export default function SettingsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const isMounted = useMounted();
  const [isClearingLocal, setIsClearingLocal] = useState(false);
  const [isClearingCloud, setIsClearingCloud] = useState(false);
  const [storageStats, setStorageStats] = useState<Record<string, number> | null>(null);

  // 获取云端存储统计
  useEffect(() => {
    if (isMounted) {
      fetchStorageStats();
    }
  }, [isMounted]);

  const fetchStorageStats = async () => {
    try {
      const response = await fetch("/api/storage");
      const data = await response.json();
      if (data.success) {
        setStorageStats(data.stats);
      }
    } catch (e) {
      console.error("获取存储统计失败:", e);
    }
  };

  // 清除本地数据（IndexedDB）
  const handleClearLocalData = async () => {
    if (!confirm(t(locale, "Clear all local data? This deletes all clothing and portrait data stored in this browser.", "确定要清除所有本地数据吗？\n这将删除所有衣服和人像数据。"))) {
      return;
    }

    setIsClearingLocal(true);
    try {
      await clearAllData();
      toast.success(t(locale, "Local data cleared.", "本地数据已清除"));
    } catch (error) {
      toast.error(t(locale, "Clear failed: ", "清除失败: ") + error);
    } finally {
      setIsClearingLocal(false);
    }
  };

  // 清除云端存储
  const handleClearCloudData = async () => {
    const confirmed = confirm(
      t(
        locale,
        "Warning: this deletes every file stored in the cloud, including portraits, clothing photos, and generated outfit images. This cannot be undone. Continue?",
        "⚠️ 警告：此操作将删除云端的所有存储文件！\n\n包括：\n• 所有上传的人像照片\n• 所有添加的衣服照片\n• 所有生成的穿搭效果图\n\n此操作不可撤销，确定继续吗？"
      )
    );
    
    if (!confirmed) return;

    setIsClearingCloud(true);
    try {
      const response = await fetch("/api/storage?all=true", {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(t(locale, `Cloud data cleared. Deleted ${data.deleted} files.`, `云端数据已清除，删除了 ${data.deleted} 个文件`));
        setStorageStats({ avatars: 0, wardrobe: 0, generated: 0 });
      } else {
        toast.error(data.error || t(locale, "Clear failed.", "清除失败"));
      }
    } catch (error) {
      toast.error(t(locale, "Clear failed: ", "清除失败: ") + error);
    } finally {
      setIsClearingCloud(false);
    }
  };

  // 清除所有数据（本地 + 云端）
  const handleClearAllData = async () => {
    const confirmed = confirm(
      t(
        locale,
        "Clear everything? This removes both local IndexedDB data and all cloud storage files. This cannot be undone.",
        "⚠️ 彻底清除所有数据！\n\n这将同时清除：\n• 本地数据（IndexedDB）\n• 云端存储文件\n\n此操作不可撤销，确定继续吗？"
      )
    );
    
    if (!confirmed) return;

    setIsClearingLocal(true);
    setIsClearingCloud(true);
    
    try {
      // 清除本地
      await clearAllData();
      toast.success(t(locale, "Local data cleared.", "本地数据已清除"));
      
      // 清除云端
      const response = await fetch("/api/storage?all=true", {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(t(locale, `Cloud data cleared. Deleted ${data.deleted} files.`, `云端数据已清除，删除了 ${data.deleted} 个文件`));
        setStorageStats({ avatars: 0, wardrobe: 0, generated: 0 });
      } else {
        toast.error(data.error || t(locale, "Cloud clear failed.", "云端清除失败"));
      }
    } catch (error) {
      toast.error(t(locale, "Clear failed: ", "清除失败: ") + error);
    } finally {
      setIsClearingLocal(false);
      setIsClearingCloud(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-4 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold flex-1 text-center pr-10">{t(locale, "Data cleanup", "清理数据")}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Storage Stats */}
        {storageStats && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              {t(locale, "Cloud storage stats", "云端存储统计")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">{t(locale, "Portraits:", "人像照片：")}</span>
                <span className="font-medium">{t(locale, `${storageStats.avatars || 0} files`, `${storageStats.avatars || 0} 个`)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">{t(locale, "Clothing photos:", "衣服照片：")}</span>
                <span className="font-medium">{t(locale, `${storageStats.wardrobe || 0} files`, `${storageStats.wardrobe || 0} 个`)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">{t(locale, "Generated images:", "生成效果图：")}</span>
                <span className="font-medium">{t(locale, `${storageStats.generated || 0} files`, `${storageStats.generated || 0} 个`)}</span>
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-3">
              {t(locale, "These files are stored in the cloud.", "所有数据存储在云端，可永久访问")}
            </p>
          </Card>
        )}

        {/* Danger Zone */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t(locale, "Danger zone", "危险操作")}
          </h2>
          
          <Card className="border-red-200">
            <div className="p-4 space-y-4">
              {/* 清除本地数据 */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{t(locale, "Clear local data", "清除本地数据")}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t(locale, "Delete all clothing and portrait data stored locally in this browser.", "删除浏览器本地存储的所有衣服和人像数据")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 border-orange-300 text-orange-600 hover:bg-orange-50"
                    size="sm"
                    disabled={isClearingLocal}
                    onClick={handleClearLocalData}
                  >
                    {isClearingLocal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t(locale, "Clearing...", "清除中...")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t(locale, "Clear local data", "清除本地数据")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* 清除云端存储 */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{t(locale, "Clear cloud storage", "清除云端存储")}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t(locale, "Delete all image files stored in the cloud, including portraits, clothes, and generated results.", "删除云端的所有图片文件（人像、衣服、效果图）")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 border-blue-300 text-blue-600 hover:bg-blue-50"
                    size="sm"
                    disabled={isClearingCloud}
                    onClick={handleClearCloudData}
                  >
                    {isClearingCloud ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t(locale, "Clearing...", "清除中...")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t(locale, "Clear cloud data", "清除云端数据")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* 彻底清除所有 */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-red-700">{t(locale, "Clear everything", "彻底清除所有数据")}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t(
                      locale,
                      "Remove local browser data and cloud files together for a full reset.",
                      "同时清除本地存储和云端文件，彻底重置应用"
                    )}
                  </p>
                  <Button
                    variant="destructive"
                    className="mt-3 bg-red-600 hover:bg-red-700"
                    size="sm"
                    disabled={isClearingLocal || isClearingCloud}
                    onClick={handleClearAllData}
                  >
                    {(isClearingLocal || isClearingCloud) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t(locale, "Clearing...", "清除中...")}
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t(locale, "Clear everything", "彻底清除全部")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Info */}
        <Card className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            <strong>{t(locale, "Notes:", "提示：")}</strong>
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>{t(locale, "• Local data is stored in this browser and cannot be recovered on another device.", "• 本地数据存储在浏览器中，更换设备后不可恢复")}</li>
            <li>{t(locale, "• Cloud data remains available until deleted, but it uses storage space.", "• 云端数据可永久访问，但会占用存储空间")}</li>
            <li>{t(locale, "• Cleaning up unused generated images regularly is a good habit.", "• 建议定期清理不需要的生成效果图")}</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
