"use client";

import React, { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, Download, AlertCircle, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaigns } from "@/lib/campaign-store";
import * as XLSX from "xlsx";

interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

interface ParsedLead {
  name: string;
  phone: string;
  company: string;
  email: string;
  notes: string;
}

export function NewCampaignModal({ open, onClose }: NewCampaignModalProps) {
  const { agents, addCampaign } = useCampaigns();
  
  // Form fields
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState(agents[0]?.name || "");
  const [purpose, setPurpose] = useState("Lead Qualification");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Completed" | "Paused" | "Scheduled">("Scheduled");
  
  // File upload state
  const [uploadedLeads, setUploadedLeads] = useState<ParsedLead[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Scheduler options
  const [autoSchedule, setAutoSchedule] = useState<boolean>(false);
  const [delayMinutes, setDelayMinutes] = useState<number>(1);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(2);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setFileName(file.name);
    setUploadError(null);

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

        const parsed: ParsedLead[] = jsonData.map((row) => {
          const rawName = row["Name"] || row["Customer Name"] || row["customerName"] || row["name"] || "";
          const rawPhone = row["Phone Number"] || row["Phone"] || row["phoneNumber"] || row["phone"] || row["Mobile"] || "";
          const rawCompany = row["Company"] || row["company"] || row["Organization"] || "";
          const rawEmail = row["Email"] || row["email"] || "";
          const rawNotes = row["Notes"] || row["notes"] || row["Summary"] || row["summary"] || row["Comment"] || "";

          return {
            name: String(rawName).trim(),
            phone: String(rawPhone).trim(),
            company: String(rawCompany).trim(),
            email: String(rawEmail).trim(),
            notes: String(rawNotes).trim(),
          };
        }).filter(lead => lead.name !== "" && lead.phone !== "");

        if (parsed.length === 0) {
          setUploadError("No valid leads found. Ensure your sheet has 'Name' and 'Phone Number' columns.");
          return;
        }

        setUploadedLeads(parsed);
      } catch (err) {
        console.error(err);
        setUploadError("Failed to parse Excel file. Please use a valid Excel workbook.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setUploadedLeads([]);
    setFileName("");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedAgentName = agentName.trim();
    const trimmedPurpose = purpose.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedAgentName) {
      alert("Please enter a Campaign Name and select an Assigned Agent.");
      return;
    }

    const leadsData = uploadedLeads.map(l => ({
      customerName: l.name.trim(),
      phoneNumber: l.phone.trim(),
      company: l.company.trim(),
      email: l.email.trim(),
      notes: l.notes.trim()
    }));

    const campaignId = addCampaign({
      name: trimmedName,
      assignedAgent: trimmedAgentName,
      purpose: trimmedPurpose,
      description: trimmedDescription || `Campaign for ${trimmedPurpose}`,
      startDate: startDate || new Date().toISOString().split("T")[0],
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status
    }, leadsData);

    if (autoSchedule && leadsData.length > 0) {
      fetch("/api/call/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leads: leadsData,
          delayMinutes,
          intervalMinutes,
          campaignId,
        }),
      })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to schedule tasks on QStash");
        }
        return res.json();
      })
      .then((data) => {
        console.log("Scheduled campaign calls successfully:", data);
      })
      .catch((err) => {
        console.error("Scheduler error during campaign creation:", err);
      });
    }

    // Reset form states
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setAutoSchedule(false);
    setDelayMinutes(1);
    setIntervalMinutes(2);
    handleRemoveFile();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Campaign</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Configure campaign parameters and import leads via Excel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Campaign Name *</label>
              <Input
                placeholder="e.g. Q3 Sales Follow-up"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs border-border bg-muted/20"
              />
            </div>

            {/* Assigned Agent */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assigned Agent *</label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.name} className="bg-card">
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Campaign Purpose</label>
              <Input
                placeholder="e.g. Lead Qualification"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="h-9 text-xs border-border bg-muted/20"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Scheduled" className="bg-card">Scheduled</option>
                <option value="Active" className="bg-card">Active</option>
                <option value="Paused" className="bg-card">Paused</option>
                <option value="Completed" className="bg-card">Completed</option>
              </select>
            </div>

            {/* Dates */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs border-border bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs border-border bg-muted/20"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Description</label>
            <textarea
              placeholder="Provide a brief description of what this campaign is about..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  Import Leads (Excel)
                </label>
                <p className="text-[10px] text-muted-foreground">Upload a spreadsheet matching the required headers.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-7 text-[10px] text-indigo-400 hover:text-indigo-300 gap-1 px-2"
              >
                <Download className="h-3 w-3" />
                Template
              </Button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            {!fileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border border-dashed border-border hover:border-indigo-500/50 hover:bg-muted/10 rounded-xl p-6 cursor-pointer transition-all"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                <span className="text-xs font-medium text-foreground">Click to upload spreadsheet</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Supports .xlsx, .xls, .csv</span>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-border rounded-xl p-3 bg-muted/10">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground truncate max-w-[280px]">{fileName}</p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold mt-0.5">
                      <Check className="h-3 w-3" />
                      {uploadedLeads.length} leads parsed successfully
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-medium">{uploadError}</span>
              </div>
            )}

            {uploadedLeads.length > 0 && (
              <>
                {/* Scheduling Options */}
                <div className="bg-muted/10 p-3.5 rounded-xl border border-border space-y-3 my-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newCampaignAutoSchedule"
                        checked={autoSchedule}
                        onChange={(e) => setAutoSchedule(e.target.checked)}
                        className="h-3.5 w-3.5 text-indigo-600 border-border rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="newCampaignAutoSchedule" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Auto-schedule calls via Upstash QStash
                      </label>
                    </div>
                   </div>

                  {autoSchedule && (
                    <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Initial Delay (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={delayMinutes}
                          onChange={(e) => setDelayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full h-8 px-2.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">Call Spacing (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full h-8 px-2.5 text-xs bg-muted/20 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/5 overflow-hidden">
                  <div className="bg-muted/20 px-3 py-1.5 border-b border-border">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Preview (First 2 Rows)</span>
                  </div>
                <div className="divide-y divide-border">
                  {uploadedLeads.slice(0, 2).map((lead, idx) => (
                    <div key={idx} className="p-2.5 text-[11px] grid grid-cols-3 gap-2">
                      <span className="font-semibold text-foreground truncate">{lead.name}</span>
                      <span className="font-mono text-muted-foreground truncate">{lead.phone}</span>
                      <span className="text-muted-foreground truncate">{lead.company || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleRemoveFile();
                onClose();
              }}
              className="h-9 text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium"
            >
              Create Campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
