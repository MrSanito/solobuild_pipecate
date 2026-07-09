"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  Users,
  Settings,
  Headphones,
  ChevronRight,
  Zap,
  Phone,
  Delete,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCampaigns } from "@/lib/campaign-store";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Call Logs", href: "/call-logs", icon: PhoneCall },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { refreshCallLogs } = useCampaigns();
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callingState, setCallingState] = useState<"idle" | "calling" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleKeyPress = (num: string) => {
    setPhoneNumber((prev) => prev + num);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPhoneNumber("");
    setCallingState("idle");
  };

  const handlePlaceCall = async () => {
    if (!phoneNumber) return;
    setCallingState("calling");
    setStatusMessage("Connecting to Vobiz carrier...");

    try {
      const response = await fetch("/api/call/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger call");
      }

      setCallingState("success");
      setStatusMessage(`Call initiated successfully! UUID: ${data.call_uuid}`);
      
      // Auto refresh database logs list
      refreshCallLogs();
    } catch (err: any) {
      setCallingState("error");
      setStatusMessage(err.message || "An unexpected error occurred");
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Headphones className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              VoiceAI
            </span>
            <span className="ml-1.5 inline-flex items-center rounded-full bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
              PRO
            </span>
          </div>
        </div>
        
        {/* Dialpad button next to VoiceAI logo text */}
        <button
          onClick={() => {
            handleClear();
            setIsDialerOpen(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Open Dialer"
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Usage Card */}
      <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Usage</span>
        </div>
        <div className="mb-1.5">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>API Calls</span>
            <span>12.8k / 20k</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-primary to-indigo-500" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/50 px-3 py-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
            VK
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Vishal Kumar</p>
            <p className="truncate text-[11px] text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>

      {/* Dialer Dialog Modal */}
      <Dialog open={isDialerOpen} onOpenChange={setIsDialerOpen}>
        <DialogContent className="max-w-[280px] bg-card border-border p-5 text-white rounded-2xl flex flex-col items-center">
          <DialogHeader className="w-full text-center">
            <DialogTitle className="text-foreground text-sm font-semibold">Voice Dialer</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              Initiate instant outbound call via Vobiz API
            </DialogDescription>
          </DialogHeader>

          {/* Number Display */}
          <div className="w-full bg-neutral-950/80 border border-border/80 rounded-xl p-3 mb-4 mt-2 flex items-center justify-between min-h-[50px]">
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter number..."
              className="bg-transparent text-lg font-mono text-white focus:outline-none w-full text-center tracking-wider"
            />
            {phoneNumber && (
              <button
                onClick={handleBackspace}
                className="text-slate-400 hover:text-white transition-colors ml-2 cursor-pointer border-0 bg-transparent p-0"
              >
                <Delete className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 w-full mb-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 border border-border hover:bg-neutral-800 text-[15px] font-semibold text-white transition-colors cursor-pointer mx-auto"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Call Status / Feedback */}
          {callingState !== "idle" && (
            <div className={`w-full p-2.5 rounded-xl border text-[11px] text-center mb-4 leading-normal ${
              callingState === "calling" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
              callingState === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Action Row */}
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              className="flex-1 h-10 border-border text-xs rounded-xl"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handlePlaceCall}
              disabled={!phoneNumber || callingState === "calling"}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl gap-2 font-semibold cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
