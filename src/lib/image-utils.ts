/**
 * 图片处理工具
 * - HEIC 转 JPEG
 * - 图片压缩
 */

/**
 * 将 HEIC/HEIF 图片转换为 JPEG
 * @param file 原文件
 * @returns 转换后的 JPEG Blob
 */
export async function convertHeicToJpeg(file: File): Promise<Blob> {
  // 如果不是 HEIC 格式，直接返回原文件
  const heicTypes = ['image/heic', 'image/heif', 'image/x-heic'];
  if (!heicTypes.includes(file.type)) {
    console.log("文件不是 HEIC 格式，直接使用原文件");
    return file;
  }

  console.log("检测到 HEIC 格式，开始转换...");

  // 尝试使用浏览器原生的 Canvas 转换
  // 如果浏览器不支持，会抛出错误
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("无法创建 Canvas context"));
        return;
      }

      // 绘制图片
      ctx.drawImage(img, 0, 0);

      // 转换为 JPEG
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            console.log("HEIC 转换成功，大小:", Math.round(blob.size / 1024), "KB");
            resolve(blob);
          } else {
            reject(new Error("Canvas 转换失败"));
          }
        },
        'image/jpeg',
        0.92 // JPEG 质量
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法加载 HEIC 图片"));
    };

    img.src = url;
  });
}

/**
 * 将文件转换为 base64
 * @param file 文件
 * @returns base64 字符串
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 检查图片格式并返回正确的处理方式
 * @param file 原文件
 * @returns 处理后的 base64 字符串
 */
export async function processImageFile(file: File): Promise<string> {
  // 检查是否为 HEIC 格式
  const heicTypes = ['image/heic', 'image/heif', 'image/x-heic'];
  const isHeic = heicTypes.includes(file.type) || file.name.toLowerCase().endsWith('.heic');

  if (isHeic) {
    console.log("检测到 HEIC 格式，尝试转换...");
    
    // 压缩图片
    const compressed = await compressImage(file, 1920, 0.9);
    
    // 将 Blob 转换为 File
    const compressedFile = new File([compressed], 'image.jpg', { type: 'image/jpeg' });
    
    // 转换为 JPEG
    const jpegBlob = await convertHeicToJpeg(compressedFile);
    
    // 返回 base64
    return fileToBase64(jpegBlob);
  }

  // 非 HEIC 格式，直接压缩并返回
  const compressed = await compressImage(file, 1920, 0.9);
  return fileToBase64(compressed);
}

/**
 * 压缩图片
 * @param file 原文件
 * @param maxWidth 最大宽度
 * @param quality 质量 (0-1)
 * @returns 压缩后的 Blob
 */
export async function compressImage(
  file: File | Blob,
  maxWidth: number = 1920,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      // 如果图片已经小于最大宽度，直接返回
      if (width <= maxWidth) {
        resolve(file);
        return;
      }

      // 计算缩放比例
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("无法创建 Canvas context"));
        return;
      }

      // 启用高质量缩放
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 获取原始 MIME 类型
      const mimeType = file instanceof File ? file.type : 'image/jpeg';
      const isJpeg = mimeType === 'image/jpeg' || mimeType === 'image/jpg';

      // 转换为 Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`图片压缩: ${img.naturalWidth}x${img.naturalHeight} -> ${width}x${height}, 大小: ${Math.round(blob.size / 1024)}KB`);
            resolve(blob);
          } else {
            reject(new Error("Canvas 转换失败"));
          }
        },
        isJpeg ? 'image/jpeg' : 'image/png',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法加载图片"));
    };

    img.src = url;
  });
}
