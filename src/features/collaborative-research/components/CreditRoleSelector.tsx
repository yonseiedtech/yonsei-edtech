"use client";

import { cn } from "@/lib/utils";
import {
  CREDIT_ROLES_ORDERED,
  CREDIT_ROLE_LABELS,
  CREDIT_ROLE_DESCRIPTIONS,
} from "../lib/credit-roles";
import type { CreditRole } from "@/types";

interface Props {
  value: CreditRole[];
  onChange: (roles: CreditRole[]) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

/** CRediT 14 역할 chip 토글 셀렉터 (다중 선택). */
export default function CreditRoleSelector({ value, onChange, disabled, size = "md" }: Props) {
  const toggle = (role: CreditRole) => {
    if (disabled) return;
    if (value.includes(role)) {
      onChange(value.filter((r) => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {CREDIT_ROLES_ORDERED.map((role) => {
        const selected = value.includes(role);
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => toggle(role)}
            title={CREDIT_ROLE_DESCRIPTIONS[role]}
            className={cn(
              "rounded-full border transition-colors",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted/5",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {CREDIT_ROLE_LABELS[role]}
          </button>
        );
      })}
    </div>
  );
}
