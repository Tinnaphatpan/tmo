import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "saed-gradient disabled:opacity-50 disabled:shadow-none",
  secondary:
    "bg-surface border border-line text-ink-900 shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-ink-300 hover:bg-surface-sunken disabled:opacity-50",
  ghost: "text-ink-700 hover:bg-surface-sunken hover:text-ink-900 disabled:opacity-50",
  // Soft by default (a wall of solid red delete buttons is noisy); solid on hover.
  danger:
    "border border-saed-200 bg-saed-50 text-saed-600 hover:border-saed-500 hover:bg-saed-500 hover:text-white disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`touch-target inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
