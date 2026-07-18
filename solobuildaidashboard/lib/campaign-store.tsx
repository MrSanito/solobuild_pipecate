"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchWithAuth } from "./api";
import { type Campaign, type CallLog, type Agent } from "./mock-data";

interface CampaignContextType {
  campaigns: Campaign[];
  callLogs: CallLog[];
  agents: Agent[];
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
  const [initialized, setInitialized] = useState(false);

  const refreshCallLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/call");
      if (res.ok) {
        const dbLogs = await res.json();
        if (Array.isArray(dbLogs)) {
          setCallLogs(dbLogs);
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
        if (Array.isArray(dbCampaigns)) {
          setCampaigns(dbCampaigns);
        }
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
        if (Array.isArray(dbAgents) && dbAgents.length > 0) {
          setAgents(dbAgents);
        }
      }
    } catch (err) {
      console.error("Failed to load agents from database:", err);
    }
  };

  // Load from database on mount
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        refreshCampaigns(),
        refreshCallLogs(),
        refreshAgents()
      ]);
      setInitialized(true);
    };
    
    loadInitialData();
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
