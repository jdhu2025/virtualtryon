"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { type Locale } from "@/lib/locale";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}

const options: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
];

export function LanguageSwitcher({
  className,
  compact = false,
  tone = "light",
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full p-1 text-xs shadow-sm",
        isDark
          ? "border border-white/10 bg-white/10 backdrop-blur-sm"
          : "border border-[#eaded2] bg-white",
        compact ? "gap-1" : "gap-1.5",
        className
      )}
      aria-label="Language switcher"
    >
      {options.map((option) => {
        const active = option.value === locale;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLocale(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 font-medium transition-colors",
              isDark
                ? active
                  ? "bg-white text-[#111827]"
                  : "text-white/78 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-[#1f2937] text-white"
                  : "text-[#6b5a4d] hover:bg-[#f8f2ec]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
