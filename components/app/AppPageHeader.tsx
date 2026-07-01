type AppPageHeaderProps = {
  title: string;
  description?: React.ReactNode;
};

export default function AppPageHeader({ title, description }: AppPageHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-semibold text-[var(--foreground)]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
