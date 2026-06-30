import { KPICards } from "@/components/dashboard/kpi-cards";
import { CallVolumeChart } from "@/components/dashboard/call-volume-chart";
import { AgentTable } from "@/components/dashboard/agent-table";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { CallLogsTable } from "@/components/dashboard/call-logs-table";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <KPICards />

      {/* Call Volume Chart */}
      <CallVolumeChart />

      {/* Agent Performance */}
      <AgentTable />

      {/* Recent Campaigns */}
      <CampaignTable />

      {/* Recent Call Logs */}
      <CallLogsTable />
    </div>
  );
}
