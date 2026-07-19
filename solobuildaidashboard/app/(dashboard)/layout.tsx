import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { CampaignProvider } from "@/lib/campaign-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CampaignProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Navbar />
          <main className="p-8 page-enter">{children}</main>
        </div>
      </div>
    </CampaignProvider>
  );
}
