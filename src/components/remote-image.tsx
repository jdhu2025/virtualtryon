"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
}

function shouldBypassOptimization(src: string): boolean {
  return (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("http://") ||
    src.startsWith("https://")
  );
}

export function RemoteImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
  fill = false,
  width,
  height,
}: RemoteImageProps) {
  if (!src) {
    return null;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes || "100vw"}
        unoptimized={shouldBypassOptimization(src)}
        className={cn(className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 800}
      priority={priority}
      sizes={sizes}
      unoptimized={shouldBypassOptimization(src)}
      className={cn(className)}
    />
  );
}
