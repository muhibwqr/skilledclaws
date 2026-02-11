"use client";

import { Card, Button } from "@skilledclaws/ui";

export interface SkillCardProps {
  name: string;
  description?: string;
  onGenerate: () => void;
  loading?: boolean;
}

export function SkillCard({
  name,
  description,
  onGenerate,
  loading = false,
}: SkillCardProps) {
  return (
    <Card className="flex w-full flex-col gap-2 sm:min-w-[200px] sm:max-w-[280px]">
      <h3 className="font-medium text-text">{name}</h3>
      {description && (
        <p className="text-muted line-clamp-2 text-sm">{description}</p>
      )}
      <Button
        variant="primary"
        onClick={onGenerate}
        disabled={loading}
        className="mt-auto"
      >
        {loading ? "Redirecting…" : "Generate for $3"}
      </Button>
    </Card>
  );
}
