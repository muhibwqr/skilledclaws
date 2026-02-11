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
          "w-full rounded-lg border bg-surface/80 px-4 py-3 text-text placeholder-muted",
          "backdrop-blur-sm outline-none transition-colors",
          "focus:border-accent/50 focus:ring-1 focus:ring-accent/20",
          isOverLimit && "border-red-500/50 focus:border-red-500/50"
        )}
        aria-invalid={isOverLimit}
        aria-describedby={isOverLimit ? "search-word-count" : undefined}
        {...rest}
      />
      <span
        id="search-word-count"
        className={clsx(
          "absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
          isOverLimit ? "text-red-400" : "text-muted"
        )}
      >
        {wordCount}/{maxWords}
      </span>
    </div>
  );
}
