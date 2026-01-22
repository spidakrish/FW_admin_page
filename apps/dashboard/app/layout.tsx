import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";

export const metadata: Metadata = {
  title: "FW Admin Dashboard",
  description: "Unified control panel for FW Document Analysis and Backpro AI"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <Navigation />
          <main className="flex-1 px-6 py-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
