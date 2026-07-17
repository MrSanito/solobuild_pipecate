"use client";

import {
  User, Building2, Phone, Calendar, Clock, Bot, Megaphone, Download, Sparkles,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CallLog } from "@/lib/mock-data";

interface CallDetailModalProps {
  call: CallLog | null;
  open: boolean;
  onClose: () => void;
}

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
    default: return "bg-slate-400";
  }
}

const infoFields = [
  { key: "customerName", label: "Customer", icon: User },
  { key: "company", label: "Company", icon: Building2 },
  { key: "phoneNumber", label: "Phone", icon: Phone },
  { key: "assignedAgent", label: "Agent", icon: Bot },
  { key: "campaign", label: "Campaign", icon: Megaphone },
  { key: "callDate", label: "Date", icon: Calendar },
  { key: "duration", label: "Duration", icon: Clock },
];

export function CallDetailModal({ call, open, onClose }: CallDetailModalProps) {
  if (!call) return null;

  const handleDownloadTranscript = () => {
    let text = "";
    if (Array.isArray(call.transcript)) {
      text = call.transcript.map(turn => {
        const isAgent = turn.speaker === "agent";
        const formatTime = (secs: number) => {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        return `[${formatTime(turn.ts)}] ${isAgent ? "Agent" : "Customer"}: ${turn.text}`;
      }).join("\n");
    } else {
      text = call.transcript;
    }
    
    if (call.summary) {
      text = `AI Summary:\n${call.summary}\n\nTranscript:\n${text}`;
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transcript-${call.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Call Details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {call.customerName} — {call.company}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer & Call Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {infoFields.map((field) => (
              <div key={field.key} className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted mt-0.5 shrink-0">
                  <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</p>
                  <p className={`font-medium text-foreground text-[13px] ${field.key === "phoneNumber" ? "font-mono text-[12px]" : ""}`}>
                    {call[field.key as keyof CallLog] as string}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted mt-0.5 shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant={getCallStatusVariant(call.status)} className="mt-0.5">
                  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getCallStatusDot(call.status)}`} />
                  {call.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Audio Player */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Audio Recording</p>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              {call.recordingPath ? (
                <>
                  <audio key={call.recordingPath} controls className="w-full h-8" preload="metadata">
                    <source src={call.recordingPath} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="mt-2 text-[11px] text-emerald-400 text-center font-medium">
                    Outbound conversation recording available
                  </p>
                </>
              ) : (
                <>
                  <audio controls className="w-full h-8 opacity-40" preload="none">
                    <source src="" type="audio/mpeg" />
                  </audio>
                  <p className="mt-2 text-[11px] text-muted-foreground text-center">
                    No recording available for this call
                  </p>
                </>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">AI Summary</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-[13px] text-foreground leading-relaxed">
                {call.summary}
              </p>
            </div>
          </div>

          {/* AI Insights (Intent, Sentiment, Status & Sub Status) */}
          {call.analysis && (call.analysis.intent || call.analysis.sentiment || call.analysis.status || call.analysis.subStatus) && (
            <div className="grid grid-cols-2 gap-4">
              {call.analysis.intent && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Customer Intent</p>
                  <p className="text-sm font-medium text-foreground">{call.analysis.intent}</p>
                </div>
              )}
              {call.analysis.sentiment && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sentiment</p>
                  <Badge variant="outline" className={`capitalize text-xs font-semibold mt-0.5 ${
                    call.analysis.sentiment.toLowerCase().includes("positive") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    call.analysis.sentiment.toLowerCase().includes("negative") ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" :
                    "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}>
                    {call.analysis.sentiment}
                  </Badge>
                </div>
              )}
              {call.analysis.status && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Call Status</p>
                  <Badge variant="outline" className={`capitalize text-xs font-semibold mt-0.5 ${
                    call.analysis.status.toLowerCase() === "answered" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    call.analysis.status.toLowerCase() === "follow up" ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                    call.analysis.status.toLowerCase() === "contacted" ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}>
                    {call.analysis.status}
                  </Badge>
                </div>
              )}
              {call.analysis.subStatus && (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sub Status</p>
                  <Badge variant="outline" className={`capitalize text-xs font-semibold mt-0.5 ${
                    call.analysis.subStatus.toLowerCase() === "appointment set" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}>
                    {call.analysis.subStatus}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Action Items */}
          {call.analysis?.actionItems && call.analysis.actionItems.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Action Items</p>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <ul className="list-disc list-inside space-y-1.5 text-[13px] text-foreground">
                  {call.analysis.actionItems.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Full Transcript</p>
            <div className="rounded-xl border border-border bg-muted/50 p-4 max-h-[250px] overflow-y-auto">
              <div className="space-y-4">
                {Array.isArray(call.transcript) ? (
                  call.transcript.map((turn, index) => {
                    const formatTime = (secs: number) => {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    };
                    const isAgent = turn.speaker === "agent";
                    return (
                      <div key={index} className="flex flex-col gap-1 border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isAgent 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}>
                            {isAgent ? "Agent" : "Customer"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatTime(turn.ts)}
                          </span>
                        </div>
                        <p className="text-[13px] text-foreground leading-relaxed">
                          {turn.text}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <pre className="text-[13px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {call.transcript}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-lg text-xs">
            Close
          </Button>
          <Button onClick={handleDownloadTranscript} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Download Transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
