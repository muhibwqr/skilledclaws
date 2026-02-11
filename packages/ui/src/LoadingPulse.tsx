"use client";

import * as React from "react";
import { clsx } from "clsx";

export interface LoadingPulseProps {
  className?: string;
  lines?: number;
}

export function LoadingPulse({ className, lines = 3 }: LoadingPulseProps) {
  return (
    <div
      className={clsx("flex flex-col gap-2", className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-border/60"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
