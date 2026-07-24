"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchWithAuth } from "./api";
import { type Campaign, type CallLog, type Agent } from "./mock-data";

interface CampaignContextType {
  campaigns: Campaign[];
  callLogs: CallLog[];
  agents: Agent[];
  totalCallsCount: number;
  completedCallsCount: number;
  addCampaign: (
    campaign: Omit<Campaign, "id" | "stats">,
    leads?: { customerName: string; phoneNumber: string; company?: string; notes?: string }[]
  ) => Promise<string>;
  addLeadsToCampaign: (
    campaignId: string,
    leads: { customerName: string; phoneNumber: string; company?: string }[]
  ) => void;
  importCampaigns: (newCampaigns: Omit<Campaign, "id" | "stats">[]) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshCallLogs: () => Promise<void>;
  refreshAgents: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [totalCallsCount, setTotalCallsCount] = useState<number>(0);
  const [completedCallsCount, setCompletedCallsCount] = useState<number>(0);
  const initialized = React.useRef(false);

  const refreshCallLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/call?limit=500");
      if (res.ok) {
        const totalHeader = res.headers.get("x-total-count");
        const completedHeader = res.headers.get("x-completed-count");
        if (totalHeader) setTotalCallsCount(Number(totalHeader));
        if (completedHeader) setCompletedCallsCount(Number(completedHeader));

        const dbLogs = await res.json();
        if (Array.isArray(dbLogs)) {
          setCallLogs(dbLogs);
          if (!totalHeader) setTotalCallsCount(dbLogs.length);
          if (!completedHeader) setCompletedCallsCount(dbLogs.filter(l => l.status === "Completed").length);
        }
      }
    } catch (err) {
      console.error("Failed to load logs from database:", err);
    }
  };

  const refreshCampaigns = async () => {
    try {
      const res = await fetchWithAuth("/api/campaigns");
      if (res.ok) {
        const dbCampaigns = await res.json();
        if (Array.isArray(dbCampaigns)) setCampaigns(dbCampaigns);
      }
    } catch (err) {
      console.error("Failed to load campaigns from database:", err);
    }
  };

  const refreshAgents = async () => {
    try {
      const res = await fetchWithAuth("/api/agents");
      if (res.ok) {
        const dbAgents = await res.json();
        if (Array.isArray(dbAgents)) setAgents(dbAgents);
      }
    } catch (err) {
      console.error("Failed to load agents from database:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const res = await fetchWithAuth("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCampaigns(data.campaigns || []);
            setAgents(data.agents || []);
            setCallLogs(data.callLogs || []);
            setTotalCallsCount(data.totalCallsCount || (data.callLogs ? data.callLogs.length : 0));
            setCompletedCallsCount(data.completedCallsCount || (data.callLogs ? data.callLogs.filter((l: any) => l.status === "Completed").length : 0));
          }
        } else {
          // Fallback
          await Promise.all([
            refreshCampaigns(),
            refreshCallLogs(),
            refreshAgents()
          ]);
        }
      } catch (err) {
        console.error("Failed to load initial dashboard data:", err);
      }
    };
    
    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const addCampaign = async (
    newCampaign: Omit<Campaign, "id" | "stats">,
    leads?: { customerName: string; phoneNumber: string; company?: string; notes?: string }[]
  ): Promise<string> => {
    try {
      const res = await fetchWithAuth("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCampaign,
          leads
        })
      });
      if (!res.ok) {
        throw new Error("Failed to create campaign");
      }
      const data = await res.json();
      await refreshCampaigns();
      if (leads && leads.length > 0) {
        await refreshCallLogs();
      }
      return data.campaignId || "";
    } catch (err) {
      console.error(err);
      return "";
    }
  };

  const addLeadsToCampaign = (
    campaignId: string,
    leads: { customerName: string; phoneNumber: string; company?: string }[]
  ) => {
    refreshCampaigns();
  };

  const importCampaigns = async (newCampaignsList: Omit<Campaign, "id" | "stats">[]) => {
    for (const nc of newCampaignsList) {
      await addCampaign(nc);
    }
  };

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        callLogs,
        agents,
        totalCallsCount,
        completedCallsCount,
        addCampaign,
        addLeadsToCampaign,
        importCampaigns,
        refreshCampaigns,
        refreshCallLogs,
        refreshAgents,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaigns() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error("useCampaigns must be used within a CampaignProvider");
  }
  return context;
}
