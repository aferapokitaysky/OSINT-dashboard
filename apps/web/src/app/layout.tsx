import type { Metadata } from "next";
import "./globals.css";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Ledger — OSINT Investigation Workspace",
  description: "Evidence-led workspace for public-source investigations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers><DashboardLayout>{children}</DashboardLayout></Providers>
      </body>
    </html>
  );
}
