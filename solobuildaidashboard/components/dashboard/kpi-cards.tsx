"use client";

import { Phone, MessageSquare, Activity, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCampaigns } from "@/lib/campaign-store";

export function KPICards() {
  const { callLogs, agents, totalCallsCount, completedCallsCount } = useCampaigns();

  // Dynamic calculations based on imported data
  const totalCalls = totalCallsCount !== undefined ? totalCallsCount : callLogs.length;
  const totalConversations = completedCallsCount !== undefined ? completedCallsCount : callLogs.filter((l) => l.status === "Completed").length;

  const displayCalls = totalCalls;
  const displayConversations = totalConversations;
  const activeAgentsCount = agents.filter((a) => a.status === "Active" || a.status === "Busy").length;

  const callsPerMin = totalCalls > 0 ? (totalCalls / 60).toFixed(1) : "0";
  const callsPerMinChange = totalCalls > 0 ? "+3.1%" : "0%";
  const totalCallsChange = totalCalls > 0 ? "+12.5%" : "0%";
  const totalConversationsChange = totalConversations > 0 ? "+8.2%" : "0%";

  const kpis = [
    {
      label: "Total Calls",
      value: displayCalls.toLocaleString(),
      change: totalCallsChange,
      trending: totalCalls > 0 ? ("up" as const) : ("neutral" as const),
      icon: Phone,
      color: "from-indigo-500 to-indigo-600",
      bgLight: "bg-indigo-50",
      textColor: "text-indigo-600",
    },
    {
      label: "Conversations",
      value: displayConversations.toLocaleString(),
      change: totalConversationsChange,
      trending: totalConversations > 0 ? ("up" as const) : ("neutral" as const),
      icon: MessageSquare,
      color: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      label: "Calls / Min",
      value: callsPerMin,
      change: callsPerMinChange,
      trending: totalCalls > 0 ? ("up" as const) : ("neutral" as const),
      icon: Activity,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      label: "Active Agents",
      value: activeAgentsCount.toString(),
      change: "0%",
      trending: "neutral" as const,
      icon: Users,
      color: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
      textColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="card-hover border-border overflow-hidden bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-[28px] font-bold tracking-tight text-foreground leading-none">
                  {kpi.value}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.color} shadow-sm`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {kpi.trending === "up" ? (
                <div className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-400">{kpi.change}</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">{kpi.change}</span>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
