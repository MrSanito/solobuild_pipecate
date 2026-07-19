"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { fetchWithAuth } from "@/lib/api";
import { UserPlus, FilePlus2, Phone, Delete, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { CallVolumeChart } from "@/components/dashboard/call-volume-chart";
import { AgentTable } from "@/components/dashboard/agent-table";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { CallLogsTable } from "@/components/dashboard/call-logs-table";
import { NewCampaignModal } from "@/components/modals/new-campaign-modal";
import { NewAgentModal } from "@/components/modals/new-agent-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCampaigns } from "@/lib/campaign-store";

export default function DashboardPage() {
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  
  // Dialer states
  const { refreshCallLogs, refreshAgents, agents } = useCampaigns();
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [callingState, setCallingState] = useState<"idle" | "calling" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Default select first agent if none is selected
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

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
      const response = await fetchWithAuth("/api/call/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          agentId: selectedAgentId,
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

  const handleSaveAgent = async (agent: any) => {
    try {
      const res = await fetchWithAuth("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });

      if (res.ok) {
        await refreshAgents();
        toast.success(`Voice Agent "${agent.name}" saved successfully!`);
      } else {
        const data = await res.json();
        toast.error(`Failed to save agent: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save agent", error);
      toast.error("Failed to save agent");
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">VoiceAI Dashboard</h2>
            <button
              onClick={() => {
                handleClear();
                setIsDialerOpen(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
              title="Open Dialer"
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time status of your active voice agents and calling campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <Button
            onClick={() => {
              handleClear();
              setIsDialerOpen(true);
            }}
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg gap-1.5 cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5" />
            Dial / Call
          </Button>
          <Button
            onClick={() => setIsAgentOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 text-xs rounded-lg gap-1.5 border-border cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Agent
          </Button>
          <Button
            onClick={() => setIsCampaignOpen(true)}
            size="sm"
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5 cursor-pointer"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Add Campaign
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards />

      {/* Call Volume Chart */}
      <CallVolumeChart />

      {/* Agent Performance */}
      <AgentTable onAddAgentClick={() => setIsAgentOpen(true)} />

      {/* Recent Campaigns */}
      <CampaignTable onAddCampaignClick={() => setIsCampaignOpen(true)} />

      {/* Recent Call Logs */}
      <CallLogsTable />

      {/* Modal Dialogs */}
      <NewCampaignModal
        open={isCampaignOpen}
        onClose={() => setIsCampaignOpen(false)}
      />

      <NewAgentModal
        open={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        onSave={handleSaveAgent}
      />

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

          <div className="w-full mb-4 px-4">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full bg-neutral-900 border border-border text-sm text-white rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {agents.length === 0 && <option value="">No agents available</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.agentName})
                </option>
              ))}
            </select>
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
              {callingState === "calling" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              {callingState === "calling" ? "Calling..." : "Call"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
