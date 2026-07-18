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
import type { Campaign } from "@/lib/mock-data";
import { CampaignDetailModal } from "@/components/modals/campaign-detail-modal";

function getCampaignStatusVariant(status: string) {
  switch (status) {
    case "Active": return "success" as const;
    case "Completed": return "info" as const;
    case "Paused": return "warning" as const;
    case "Scheduled": return "secondary" as const;
    default: return "secondary" as const;
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "Active": return "bg-emerald-500";
    case "Completed": return "bg-blue-500";
    case "Paused": return "bg-amber-500";
    case "Scheduled": return "bg-slate-400";
    default: return "bg-slate-400";
  }
}

interface CampaignTableProps {
  onAddCampaignClick?: () => void;
}

export function CampaignTable({ onAddCampaignClick }: CampaignTableProps) {
  const { campaigns } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);


  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Recent Campaigns</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Active and recent calling campaigns</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onAddCampaignClick && (
                <Button 
                  onClick={onAddCampaignClick}
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 rounded-lg cursor-pointer"
                >
                  Add Campaign
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg">
                View All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Agent</TableHead>
                <TableHead className="text-xs">Purpose</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow 
                    key={campaign.id} 
                    className="group cursor-pointer hover:bg-muted/50 transition-colors border-border"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <TableCell className="font-medium text-foreground text-[13px]">
                      {campaign.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">{campaign.assignedAgent}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700">
                        {campaign.purpose}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {new Date(campaign.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {new Date(campaign.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCampaignStatusVariant(campaign.status)}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDot(campaign.status)}`} />
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        Details
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CampaignDetailModal
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </>
  );
}
