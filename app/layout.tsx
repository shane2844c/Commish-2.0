import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./critical.css";

export const metadata: Metadata = {
  title: "Commish 2.0",
  description: "Sales performance dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased"
        style={{
          margin: 0,
          backgroundColor: "#f3f6fb",
          color: "#152238",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
