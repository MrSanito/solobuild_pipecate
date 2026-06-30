"use client";

import { useState, useRef } from "react";
import { Plus, Search, Filter, Upload, Download, Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/lib/campaign-store";
import { CampaignDetailModal } from "@/components/modals/campaign-detail-modal";
import { NewCampaignModal } from "@/components/modals/new-campaign-modal";
import type { Campaign } from "@/lib/mock-data";
import * as XLSX from "xlsx";

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

export default function CampaignsPage() {
  const { campaigns, callLogs, importCampaigns } = useCampaigns();
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Excel import states
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.assignedAgent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic summary stats
  const activeCount = campaigns.filter(c => c.status === "Active").length;
  const completedCount = campaigns.filter(c => c.status === "Completed").length;
  const pausedCount = campaigns.filter(c => c.status === "Paused").length;

  const summaryStats = [
    { label: "Total Campaigns", value: campaigns.length.toString(), color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Active", value: activeCount.toString(), color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Completed", value: completedCount.toString(), color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Paused", value: pausedCount.toString(), color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const handleDownloadCampaignTemplate = () => {
    const wsData = [
      ["Campaign Name", "Assigned Agent", "Purpose", "Description", "Start Date", "End Date", "Status"],
      ["Q3 Sales Push", "Sarah Mitchell", "Lead Qualification", "Outbound calls to warm leads", "2026-07-01", "2026-07-31", "Scheduled"],
      ["Feedback Collection", "James Rodriguez", "Survey Collection", "Post-support satisfaction survey", "2026-07-05", "2026-08-05", "Active"],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-fit columns
    const maxLens = wsData[0].map((_, colIdx) => 
      Math.max(...wsData.map(row => String(row[colIdx] || "").length))
    );
    ws["!cols"] = maxLens.map(len => ({ wch: len + 3 }));

    XLSX.utils.book_append_sheet(wb, ws, "Campaigns Template");
    XLSX.writeFile(wb, "voiceai_campaigns_template.xlsx");
  };

  const handleCampaignsImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          setImportError("The uploaded Excel sheet is empty.");
          return;
        }

        const parsedCampaigns = jsonData.map((row) => {
          const name = row["Campaign Name"] || row["Name"] || row["campaignName"] || "";
          const assignedAgent = row["Assigned Agent"] || row["Agent"] || row["assignedAgent"] || "";
          const purpose = row["Purpose"] || row["purpose"] || "Lead Qualification";
          const description = row["Description"] || row["description"] || "";
          const startDate = row["Start Date"] || row["startDate"] || new Date().toISOString().split("T")[0];
          const endDate = row["End Date"] || row["endDate"] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const status = row["Status"] || row["status"] || "Scheduled";

          return {
            name: String(name).trim(),
            assignedAgent: String(assignedAgent).trim(),
            purpose: String(purpose).trim(),
            description: String(description).trim(),
            startDate: String(startDate).trim(),
            endDate: String(endDate).trim(),
            status: status as any,
          };
        }).filter((c) => c.name !== "" && c.assignedAgent !== "");

        if (parsedCampaigns.length === 0) {
          setImportError("No valid campaigns found. Make sure your Excel sheet has 'Campaign Name' and 'Assigned Agent' columns.");
          return;
        }

        importCampaigns(parsedCampaigns);
        setImportSuccess(`Successfully imported ${parsedCampaigns.length} campaigns!`);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error(err);
        setImportError("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryStats.map((stat) => (
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

      {/* Import Notifications */}
      {importError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">{importError}</span>
        </div>
      )}
      {importSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold">{importSuccess}</span>
        </div>
      )}

      {/* Campaigns Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">All Campaigns</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Manage and monitor your calling campaigns</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-52 pl-9 h-8 text-xs bg-muted/50 border-border rounded-lg"
                />
              </div>

              {/* Hidden file input for importing campaigns */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCampaignsImport}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />

              {/* Download Campaign Import Template */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCampaignTemplate}
                className="h-8 text-xs rounded-lg gap-1.5 border-border"
                title="Download Excel template for importing campaigns"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </Button>

              {/* Import Campaigns Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs rounded-lg gap-1.5 border-border"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Campaigns
              </Button>

              {/* Add New Campaign */}
              <Button 
                size="sm" 
                onClick={() => setIsCreateOpen(true)}
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                New Campaign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Campaign Name</TableHead>
                <TableHead className="text-xs">Assigned Agent</TableHead>
                <TableHead className="text-xs">Purpose</TableHead>
                <TableHead className="text-xs">Start Date</TableHead>
                <TableHead className="text-xs">End Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Leads Count</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => {
                const campaignLeadsCount = callLogs.filter(log => log.campaign === campaign.name).length;
                return (
                  <TableRow key={campaign.id} className="group">
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
                      {new Date(campaign.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[13px]">
                      {new Date(campaign.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCampaignStatusVariant(campaign.status)}>
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDot(campaign.status)}`} />
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] font-semibold text-foreground">
                      {campaignLeadsCount > 0 ? `${campaignLeadsCount} Leads` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CampaignDetailModal
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />

      <NewCampaignModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
