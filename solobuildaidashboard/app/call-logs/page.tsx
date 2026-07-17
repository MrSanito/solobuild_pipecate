"use client";

import { useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/lib/campaign-store";
import type { CallLog } from "@/lib/mock-data";
import { CallDetailModal } from "@/components/modals/call-detail-modal";

function getCallStatusVariant(status: string) {
  switch (status) {
    case "Completed": return "success" as const;
    case "No Answer": return "warning" as const;
    case "Voicemail": return "info" as const;
    case "Failed": return "destructive" as const;
    case "In Progress": return "default" as const;
    default: return "secondary" as const;
  }
}

function getCallStatusDot(status: string) {
  switch (status) {
    case "Completed": return "bg-emerald-500";
    case "No Answer": return "bg-amber-500";
    case "Voicemail": return "bg-blue-500";
    case "Failed": return "bg-red-500";
    case "In Progress": return "bg-indigo-500 pulse-dot";
    default: return "bg-slate-400";
  }
}

export default function CallLogsPage() {
  const { callLogs } = useCampaigns();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const completedCount = callLogs.filter(c => c.status === "Completed").length;
  const noAnswerCount = callLogs.filter(c => c.status === "No Answer").length;
  const failedCount = callLogs.filter(c => c.status === "Failed").length;

  const statusCounts = [
    { label: "All Calls", value: String(callLogs.length), color: "text-foreground", bg: "bg-muted" },
    { label: "Completed", value: String(completedCount), color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "No Answer", value: String(noAnswerCount), color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Failed", value: String(failedCount), color: "text-red-600", bg: "bg-red-50" },
  ];

  const filteredLogs = callLogs.filter(c =>
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Status Counts */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statusCounts.map((stat) => (
          <Card key={stat.label} className="card-hover border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <span className="text-[13px] text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call Logs Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Call History</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Complete log of all voice calls</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-52 pl-9 h-8 text-xs bg-muted/50 border-border rounded-lg"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Phone Number</TableHead>
                <TableHead className="text-xs">Agent</TableHead>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((call) => (
                <TableRow key={call.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {call.customerName.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium text-foreground text-[13px]">{call.customerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{call.company}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[11px]">{call.phoneNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{call.assignedAgent}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground truncate max-w-[140px]">
                      {call.campaign}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground font-semibold text-[13px]">{call.duration}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{call.callDate}</TableCell>
                  <TableCell>
                    <Badge variant={getCallStatusVariant(call.status)}>
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getCallStatusDot(call.status)}`} />
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                      onClick={() => setSelectedCall(call)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CallDetailModal
        call={selectedCall}
        open={!!selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}
