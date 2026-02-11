"use client";

import * as React from "react";
import { clsx } from "clsx";

export interface SkillBadgeProps {
  name: string;
  className?: string;
}

export function SkillBadge({ name, className }: SkillBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-border bg-surface/80 px-2.5 py-0.5 text-xs font-medium text-muted",
        className
      )}
    >
      {name}
    </span>
  );
}
