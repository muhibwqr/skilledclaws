"use client";

import * as React from "react";
import { clsx } from "clsx";

const MAX_WORDS = 5;

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  maxWords?: number;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  maxWords = MAX_WORDS,
  className,
  placeholder = "Search skills (max 5 words)...",
  onKeyDown,
  ...rest
}: SearchBarProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > maxWords;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    const words = next.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
      onChange(next);
    } else {
      onChange(words.slice(0, maxWords).join(" "));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isOverLimit && value.trim()) {
      onSearch?.(value.trim());
    }
    onKeyDown?.(e);
  };

  return (
    <div className={clsx("relative w-full max-w-xl", className)}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={clsx(
          "w-full",
          "bg-[#000000]",
          "border border-[#1a1a1a]",
          "px-4 py-3",
          "text-[#f5f5f5]",
          "placeholder-[#666666]",
          "text-sm",
          "outline-none",
          "transition-all duration-150",
          "focus:border-[#2a2a2a]",
          "hover:border-[#1f1f1f]",
          isOverLimit && "border-[#2a2a2a] focus:border-[#2a2a2a]"
        )}
        style={{ 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        aria-invalid={isOverLimit}
        aria-describedby={isOverLimit ? "search-word-count" : undefined}
        {...rest}
      />
      <span
        id="search-word-count"
        className={clsx(
          "absolute right-4 top-1/2 -translate-y-1/2 text-[10px] tabular-nums uppercase tracking-wider font-medium",
          isOverLimit ? "text-[#a0a0a0]" : "text-[#666666]"
        )}
      >
        {wordCount}/{maxWords}
      </span>
    </div>
  );
}
