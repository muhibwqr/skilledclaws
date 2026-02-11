"use client";

import * as React from "react";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "ghost" | "outline";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-background hover:bg-accent/90 focus:ring-accent/50",
  ghost:
    "bg-transparent text-text hover:bg-surface focus:ring-border",
  outline:
    "border border-border bg-transparent text-text hover:bg-surface focus:ring-border",
};

export function Button({
  variant = "primary",
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
