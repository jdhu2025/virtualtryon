"use client";

import { Camera, FolderOpen, Image as ImageIcon, X } from "lucide-react";
import { useLocale } from "@/contexts/locale-context";
import { t } from "@/lib/locale";

interface ImageSourceSheetProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onChooseLibrary: () => void;
  onChooseCamera: () => void;
  onChooseFile: () => void;
}

export function ImageSourceSheet({
  open,
  title,
  description,
  onClose,
  onChooseLibrary,
  onChooseCamera,
  onChooseFile,
}: ImageSourceSheetProps) {
  const { locale } = useLocale();

  if (!open) return null;

  const options = [
    { label: t(locale, "Photo library", "照片图库"), icon: ImageIcon, action: onChooseLibrary },
    { label: t(locale, "Take photo", "拍照"), icon: Camera, action: onChooseCamera },
    { label: t(locale, "Choose file", "选取文件"), icon: FolderOpen, action: onChooseFile },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-black/35 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            aria-label={t(locale, "Close", "关闭")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  onClose();
                  option.action();
                }}
                className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#fff5fa] ${
                  index !== options.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                <span className="text-[1.75rem] font-medium text-gray-900">{option.label}</span>
                <Icon className="h-7 w-7 text-gray-700" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
