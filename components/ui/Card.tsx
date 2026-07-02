import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`commish-auth-card rounded-2xl border border-[var(--border)] bg-white shadow-[0_10px_25px_rgba(0,74,147,0.08)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
