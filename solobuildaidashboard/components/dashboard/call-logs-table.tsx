"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
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

export function CallLogsTable() {
  const { callLogs } = useCampaigns();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);


  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Recent Call Logs</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Latest calls and their outcomes</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callLogs.map((call) => (
                <TableRow 
                  key={call.id} 
                  className="group cursor-pointer hover:bg-muted/50 transition-colors border-border"
                  onClick={() => setSelectedCall(call)}
                >
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
                  <TableCell className="text-foreground font-semibold text-[13px]">{call.duration}</TableCell>
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
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedCall(call)}
                    >
                      Details
                      <ArrowRight className="h-3 w-3" />
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
    </>
  );
}
