"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Filter, Download, X, ChevronDown, Check } from "lucide-react";
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

// ─── helpers ──────────────────────────────────────────────────────────────────
const ALL_STATUSES = ["Completed", "No Answer", "Voicemail", "Failed", "In Progress", "Pending"] as const;
type CallStatus = typeof ALL_STATUSES[number];

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

// ─── CSV export ───────────────────────────────────────────────────────────────
function exportToCSV(logs: CallLog[]) {
  const headers = [
    "Customer Name", "Company", "Phone Number", "Agent", "Campaign",
    "Duration", "Date", "Status", "Sub Status", "Summary",
  ];

  const rows = logs.map((c) => [
    c.customerName,
    c.company,
    c.phoneNumber,
    c.assignedAgent,
    c.campaign,
    c.duration,
    c.callDate,
    c.status,
    c.analysis?.subStatus || "",
    (c.summary || "").replace(/\n/g, " "),
  ].map((val) => `"${String(val).replace(/"/g, '""')}"`));

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
interface FilterDropdownProps {
  selectedStatuses: Set<CallStatus>;
  dateFrom: string;
  dateTo: string;
  onToggleStatus: (s: CallStatus) => void;
  onSelectAll: () => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
  activeFilterCount: number;
}

function FilterDropdown({
  selectedStatuses, dateFrom, dateTo,
  onToggleStatus, onSelectAll,
  onDateFromChange, onDateToChange,
  onReset, activeFilterCount,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSelected = selectedStatuses.size === 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className={`h-8 text-xs rounded-lg gap-1.5 ${activeFilterCount > 0 ? "border-indigo-400 text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter className="h-3.5 w-3.5" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-border bg-card shadow-lg p-4 space-y-4">
          {/* Status multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <span className="text-[10px] text-muted-foreground italic">click to toggle · click again to deselect</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* All chip */}
              <button
                onClick={onSelectAll}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                  allSelected
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {allSelected && <Check className="h-2.5 w-2.5" />}
                All
              </button>
              {ALL_STATUSES.map((s) => {
                const active = selectedStatuses.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => onToggleStatus(s)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                      active
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {active && <Check className="h-2.5 w-2.5" />}
                    {s}
                  </button>
                );
              })}
            </div>
            {selectedStatuses.size > 0 && (
              <p className="mt-2 text-[10px] text-indigo-600 font-medium">
                {selectedStatuses.size} status{selectedStatuses.size > 1 ? "es" : ""} selected
              </p>
            )}
          </div>

          {/* Date range */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Date Range</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="w-full h-7 rounded-lg border border-border bg-muted/40 px-2 text-[11px] text-foreground outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="w-full h-7 rounded-lg border border-border bg-muted/40 px-2 text-[11px] text-foreground outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { onReset(); setOpen(false); }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-medium text-muted-foreground hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CallLogsPage() {
  const { callLogs, totalCallsCount, completedCallsCount } = useCampaigns();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Multi-select: empty set = All statuses
  const [selectedStatuses, setSelectedStatuses] = useState<Set<CallStatus>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handleToggleStatus = (s: CallStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); // click again = deselect
      else next.add(s);
      return next;
    });
  };

  const handleSelectAll = () => setSelectedStatuses(new Set()); // empty = All

  // Active filter count
  const activeFilterCount =
    (selectedStatuses.size > 0 ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedStatuses(new Set());
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  // Apply all filters
  const filteredLogs = callLogs.filter((c) => {
    // search
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q) ||
      c.assignedAgent.toLowerCase().includes(q) ||
      c.campaign.toLowerCase().includes(q);

    // multi-status: empty set = all pass
    const matchesStatus = selectedStatuses.size === 0 || selectedStatuses.has(c.status as CallStatus);

    // date range – parse callDate back to a comparable date
    let matchesDate = true;
    if (dateFrom || dateTo) {
      // callDate is formatted like "Jul 24, 2025, 10:30 AM"
      const callTs = new Date(c.callDate).getTime();
      if (!isNaN(callTs)) {
        if (dateFrom) {
          const fromTs = new Date(dateFrom).setHours(0, 0, 0, 0);
          if (callTs < fromTs) matchesDate = false;
        }
        if (dateTo) {
          const toTs = new Date(dateTo).setHours(23, 59, 59, 999);
          if (callTs > toTs) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const noAnswerCount = callLogs.filter((c) => c.status === "No Answer").length;
  const failedCount = callLogs.filter((c) => c.status === "Failed").length;

  const statusCounts = [
    { label: "All Calls (Lifetime)", value: String(totalCallsCount || callLogs.length), color: "text-foreground", bg: "bg-muted" },
    { label: "Completed", value: String(completedCallsCount || callLogs.filter((c) => c.status === "Completed").length), color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "No Answer", value: String(noAnswerCount), color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Failed", value: String(failedCount), color: "text-red-600", bg: "bg-red-50" },
  ];

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

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Active filters:</span>
          {/* One chip per selected status */}
          {Array.from(selectedStatuses).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              {s}
              <button onClick={() => handleToggleStatus(s)} className="ml-0.5 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
            </span>
          ))}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              From: {dateFrom}
              <button onClick={() => setDateFrom("")} className="ml-0.5 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
              To: {dateTo}
              <button onClick={() => setDateTo("")} className="ml-0.5 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
            </span>
          )}
          <button
            onClick={handleResetFilters}
            className="text-[11px] text-muted-foreground underline hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Call Logs Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Call History</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredLogs.length} of {callLogs.length} calls
                {activeFilterCount > 0 ? " (filtered)" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-52 pl-9 h-8 text-xs bg-muted/50 border-border rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Filter dropdown */}
              <FilterDropdown
                selectedStatuses={selectedStatuses}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onToggleStatus={handleToggleStatus}
                onSelectAll={handleSelectAll}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onReset={handleResetFilters}
                activeFilterCount={activeFilterCount}
              />

              {/* Export CSV */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg gap-1.5"
                onClick={() => exportToCSV(filteredLogs)}
                disabled={filteredLogs.length === 0}
                title={`Export ${filteredLogs.length} rows as CSV`}
              >
                <Download className="h-3.5 w-3.5" />
                Export {filteredLogs.length > 0 ? `(${filteredLogs.length})` : ""}
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
                <TableHead className="text-xs">Sub Status</TableHead>
                <TableHead className="text-xs w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Filter className="h-6 w-6 opacity-30" />
                      <span className="text-[13px]">No call logs match the current filters.</span>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="text-[12px] text-indigo-600 hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((call) => (
                  <TableRow key={call.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                          {call.customerName.split(" ").map((n) => n[0]).join("")}
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
                      {call.analysis?.subStatus ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          call.analysis.subStatus.toLowerCase() === "appointment set"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }`}>
                          {call.analysis.subStatus}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[12px]">—</span>
                      )}
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
                ))
              )}
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
