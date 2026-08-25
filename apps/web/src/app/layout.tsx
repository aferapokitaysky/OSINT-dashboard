import type { Metadata } from "next";
import "./globals.css";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "OSINT Intelligence Platform",
  description: "Advanced intelligence workspace and entity enrichment pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-mono">
        <Providers><DashboardLayout>{children}</DashboardLayout></Providers>
      </body>
    </html>
  );
}
