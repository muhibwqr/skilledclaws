"use client";

import * as React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-surface p-4 shadow-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={clsx("mb-2 text-sm font-medium text-text", className)}>
      {children}
    </div>
  );
}

export interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
  return <div className={clsx("text-muted text-sm", className)}>{children}</div>;
}
