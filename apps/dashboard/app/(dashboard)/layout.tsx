import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 px-6 py-10">{children}</main>
      <Footer />
    </div>
  );
}
