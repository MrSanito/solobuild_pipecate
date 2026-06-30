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
              <audio controls className="w-full h-8" preload="none">
                <source src="" type="audio/mpeg" />
              </audio>
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                Sample audio — no recording available in demo
              </p>
            </div>
          </div>

          {/* Transcript */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Full Transcript</p>
            <div className="rounded-xl border border-border bg-muted/50 p-4 max-h-[200px] overflow-y-auto">
              <pre className="text-[13px] text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {call.transcript}
              </pre>
            </div>
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Summary</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-[13px] text-foreground leading-relaxed">
                {call.summary}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-lg text-xs">
            Close
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Download Transcript
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
