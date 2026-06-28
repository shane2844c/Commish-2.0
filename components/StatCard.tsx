type StatCardProps = {
  label: string;
  value: string;
  subtext?: string;
  highlight?: "default" | "projected";
};

export default function StatCard({
  label,
  value,
  subtext,
  highlight = "default",
}: StatCardProps) {
  const isProjected = highlight === "projected";

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-[0_6px_18px_rgba(0,74,147,0.08)] ${
        isProjected ? "border-blue-200 bg-[#f7fbff]" : "border-[var(--border)]"
      }`}
    >
      <p className="text-sm font-semibold tracking-wide text-[var(--brand)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      {subtext && <p className="mt-1 text-xs text-[var(--muted)]">{subtext}</p>}
    </div>
  );
}
