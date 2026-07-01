import AppPageHeader from "./AppPageHeader";

type AppPageProps = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

/** Page chrome for routes under app/(app)/ — never add shell/header/sidebar here. */
export default function AppPage({ title, description, children }: AppPageProps) {
  return (
    <>
      <AppPageHeader title={title} description={description} />
      {children}
    </>
  );
}
