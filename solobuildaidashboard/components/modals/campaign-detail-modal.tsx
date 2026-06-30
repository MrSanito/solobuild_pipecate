"use client";

import React, { useState, useRef } from "react";
import { Phone, PhoneOff, CheckCircle, TrendingUp, UserCog, Upload, Download, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCampaigns } from "@/lib/campaign-store";
import type { Campaign } from "@/lib/mock-data";
import * as XLSX from "xlsx";

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}

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

function getCallStatusVariant(status: string) {
  switch (status) {
    case "Completed": return "success" as const;
    case "No Answer": return "warning" as const;
    case "Voicemail": return "info" as const;
    case "Failed": return "destructive" as const;
    case "In Progress": return "default" as const;
    case "Pending": return "secondary" as const;
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
    case "Pending": return "bg-slate-400";
    default: return "bg-slate-400";
  }
}

const statConfig = [
  { key: "totalCalls", label: "Total Calls", icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "connected", label: "Connected", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "failed", label: "Failed", icon: PhoneOff, color: "text-red-500", bg: "bg-red-50" },
  { key: "successRate", label: "Success Rate", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
];

export function CampaignDetailModal({ campaign, open, onClose }: CampaignDetailModalProps) {
  const { callLogs, addLeadsToCampaign } = useCampaigns();
  const [activeTab, setActiveTab] = useState<"overview" | "leads">("overview");
  
  // File upload state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!campaign) return null;

  // Filter logs for this campaign
  const campaignLeads = callLogs.filter(log => log.campaign === campaign.name);

  // Generate statistics dynamically if we have pending logs
  const pendingCount = campaignLeads.filter(l => l.status === "Pending").length;
  const completedLeads = campaignLeads.filter(l => l.status === "Completed");
  const failedLeads = campaignLeads.filter(l => l.status === "Failed" || l.status === "No Answer");
  
  // If we have custom loaded leads, let's adjust stats
  const totalCallsCount = campaignLeads.length;
  const connectedCount = campaignLeads.filter(l => l.status === "Completed" || l.status === "Voicemail").length;
  const failedCount = campaignLeads.filter(l => l.status === "Failed" || l.status === "No Answer").length;
  const successRate = totalCallsCount - pendingCount > 0 
    ? parseFloat(((connectedCount / (totalCallsCount - pendingCount)) * 100).toFixed(1))
    : 0;

  const displayStats = {
    totalCalls: totalCallsCount,
    connected: connectedCount,
    failed: failedCount,
    successRate: campaign.stats.totalCalls === 0 && totalCallsCount > 0 ? successRate : (campaign.stats.successRate || successRate)
  };

  const handleDownloadTemplate = () => {
    const wsData = [
      ["Name", "Phone Number", "Company", "Email", "Notes"],
      ["John Doe", "+1 (555) 0192", "Acme Corp", "john@example.com", "Interested in Q2 pricing"],
      ["Jane Smith", "+1 (212) 555-9831", "Beta Solutions", "jane@example.com", "Ask about CRM integration"],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-fit column widths
    const maxLens = wsData[0].map((_, colIdx) => 
      Math.max(...wsData.map(row => String(row[colIdx] || "").length))
    );
    ws["!cols"] = maxLens.map(len => ({ wch: len + 3 }));

    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    XLSX.writeFile(wb, "voiceai_leads_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          setUploadError("The uploaded sheet is empty.");
          return;
        }

        const parsed = jsonData.map((row) => {
          const rawName = row["Name"] || row["Customer Name"] || row["customerName"] || row["name"] || "";
          const rawPhone = row["Phone Number"] || row["Phone"] || row["phoneNumber"] || row["phone"] || row["Mobile"] || "";
          const rawCompany = row["Company"] || row["company"] || row["Organization"] || "";

          return {
            customerName: String(rawName).trim(),
            phoneNumber: String(rawPhone).trim(),
            company: String(rawCompany).trim(),
          };
        }).filter(lead => lead.customerName !== "" && lead.phoneNumber !== "");

        if (parsed.length === 0) {
          setUploadError("No valid leads found. Ensure your sheet has 'Name' and 'Phone Number' columns.");
          return;
        }

        addLeadsToCampaign(campaign.id, parsed);
        setUploadSuccessCount(parsed.length);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error(err);
        setUploadError("Failed to parse Excel file. Please use a valid Excel workbook.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="mb-2 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground text-[16px] font-semibold">{campaign.name}</DialogTitle>
            <Badge variant={getCampaignStatusVariant(campaign.status)} className="mr-6">
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDot(campaign.status)}`} />
              {campaign.status}
            </Badge>
          </div>
          <DialogDescription className="text-muted-foreground text-xs">{campaign.purpose}</DialogDescription>
        </DialogHeader>

        {/* Tab Controls */}
        <div className="flex border-b border-border mb-4 shrink-0">
          <button
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setActiveTab("overview");
              setUploadError(null);
              setUploadSuccessCount(null);
            }}
          >
            Overview
          </button>
          <button
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "leads"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setActiveTab("leads");
              setUploadError(null);
              setUploadSuccessCount(null);
            }}
          >
            Contact List ({campaignLeads.length})
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {activeTab === "overview" ? (
            <div className="space-y-5">
              {/* Description */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {campaign.description}
                </p>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 border border-border rounded-xl p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Assigned Agent</p>
                  <p className="font-medium text-foreground text-[13px]">{campaign.assignedAgent}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Purpose</p>
                  <p className="font-medium text-foreground text-[13px]">{campaign.purpose}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
                  <p className="font-medium text-foreground text-[13px]">
                    {new Date(campaign.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">End Date</p>
                  <p className="font-medium text-foreground text-[13px]">
                    {new Date(campaign.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Campaign Performance</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {statConfig.map((stat) => {
                    const val = stat.key === "successRate"
                      ? `${displayStats.successRate}%`
                      : displayStats[stat.key as keyof typeof displayStats].toLocaleString();
                    return (
                      <div key={stat.label} className="rounded-xl border border-border p-3 text-center bg-card">
                        <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                          <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <p className="text-[16px] font-bold text-foreground">{val}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Import Leads</p>
                  <p className="text-[10px] text-muted-foreground">Add new numbers to this campaign via Excel.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="h-8 text-xs gap-1.5 rounded-lg border-border"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Template
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 rounded-lg"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Excel
                  </Button>
                </div>
              </div>

              {/* Upload Notifications */}
              {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-rose-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-medium">{uploadError}</span>
                </div>
              )}
              {uploadSuccessCount !== null && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-semibold">{uploadSuccessCount} leads successfully imported and queued!</span>
                </div>
              )}

              {/* Leads Table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="max-h-[320px] overflow-y-auto">
                  {campaignLeads.length === 0 ? (
                    <div className="text-center py-10">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-semibold text-muted-foreground">No leads imported yet</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Click Upload Excel above to add leads to this campaign</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/10 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs py-2 h-9">Customer</TableHead>
                          <TableHead className="text-xs py-2 h-9">Company</TableHead>
                          <TableHead className="text-xs py-2 h-9">Phone Number</TableHead>
                          <TableHead className="text-xs py-2 h-9">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignLeads.map((lead) => (
                          <TableRow key={lead.id} className="hover:bg-muted/30 border-border">
                            <TableCell className="font-medium text-foreground text-[12px] py-2">
                              {lead.customerName}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-[12px] py-2 truncate max-w-[120px]">
                              {lead.company}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-[11px] py-2">
                              {lead.phoneNumber}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={getCallStatusVariant(lead.status)} className="text-[10px] px-1.5 py-0">
                                <span className={`mr-1 inline-block h-1 w-1 rounded-full ${getCallStatusDot(lead.status)}`} />
                                {lead.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t border-border pt-4 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-lg text-xs h-9">
            Close
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs h-9 gap-1.5">
            <UserCog className="h-3.5 w-3.5" />
            Change Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
