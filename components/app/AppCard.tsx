type AppCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function AppCard({ children, className = "" }: AppCardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
