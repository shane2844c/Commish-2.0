export default function CompliancePage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Compliance</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Compliance tracking section is ready for your next workflow.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <p className="text-sm text-[var(--muted)]">
          Add compliance checkpoints, attestations, and audit logs here.
        </p>
      </div>
    </>
  );
}
