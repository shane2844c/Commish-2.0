import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "commish-btn-primary rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50",
  secondary:
    "rounded-lg border border-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)] disabled:opacity-50",
  ghost:
    "rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)] disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
