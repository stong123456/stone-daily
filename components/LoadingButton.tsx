"use client";

import { CircleNotch } from "@phosphor-icons/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "soft" | "danger";
}

export function LoadingButton({ loading = false, icon, children, className = "", variant = "primary", disabled, ...props }: LoadingButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <CircleNotch aria-hidden className="spin" size={18} /> : icon}
      <span>{loading ? "正在处理…" : children}</span>
    </button>
  );
}
