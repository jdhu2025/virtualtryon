import { NextRequest, NextResponse } from "next/server";
import { clearUserStorage, clearAllStorage, getStorageStats } from "@/storage/s3-storage";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * 存储管理 API
 * 
 * 支持操作：
 * - GET: 获取存储统计
 * - DELETE: 清除用户数据
 * - DELETE /all: 清除所有数据（管理员）
 */

/**
 * GET - 获取存储统计
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    
    const stats = await getStorageStats(userId);
    
    return NextResponse.json({
      success: true,
      stats,
      message: userId 
        ? `用户 ${userId} 的存储统计` 
        : "所有用户的存储统计"
    });
  } catch (error: unknown) {
    console.error("获取存储统计失败:", error);
    return NextResponse.json({
      success: false,
      error: getErrorMessage(error, "获取存储统计失败")
    }, { status: 500 });
  }
}

/**
 * DELETE - 清除存储数据
 * 
 * 查询参数：
 * - userId: 清除指定用户的数据（不传则清除所有）
 * - all: 设置为 "true" 清除所有数据（慎用）
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const clearAll = searchParams.get("all") === "true";
    
    let result;
    
    if (clearAll) {
      // 清除所有数据（管理员功能）
      console.log("[Storage API] 清除所有存储数据...");
      result = await clearAllStorage();
      
      return NextResponse.json({
        success: true,
        message: "已清除所有存储数据",
        deleted: result.deleted,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } else if (userId) {
      // 清除指定用户的数据
      console.log(`[Storage API] 清除用户 ${userId} 的存储数据...`);
      result = await clearUserStorage(userId);
      
      return NextResponse.json({
        success: true,
        message: `已清除用户 ${userId} 的存储数据`,
        deleted: result.deleted,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "请提供 userId 参数或设置 all=true"
      }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("清除存储失败:", error);
    return NextResponse.json({
      success: false,
      error: getErrorMessage(error, "清除存储失败")
    }, { status: 500 });
  }
}
