"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { campaigns as initialCampaigns, callLogs as initialCallLogs, agents as initialAgents, type Campaign, type CallLog, type Agent } from "./mock-data";

interface CampaignContextType {
  campaigns: Campaign[];
  callLogs: CallLog[];
  agents: Agent[];
  addCampaign: (
    campaign: Omit<Campaign, "id" | "stats">,
    leads?: { customerName: string; phoneNumber: string; company?: string }[]
  ) => void;
  addLeadsToCampaign: (
    campaignId: string,
    leads: { customerName: string; phoneNumber: string; company?: string }[]
  ) => void;
  importCampaigns: (newCampaigns: Omit<Campaign, "id" | "stats">[]) => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCampaigns = localStorage.getItem("voiceai_campaigns");
    const savedLogs = localStorage.getItem("voiceai_call_logs");

    if (savedCampaigns) {
      try {
        setCampaigns(JSON.parse(savedCampaigns));
      } catch (e) {
        setCampaigns(initialCampaigns);
      }
    } else {
      setCampaigns(initialCampaigns);
    }

    if (savedLogs) {
      try {
        setCallLogs(JSON.parse(savedLogs));
      } catch (e) {
        setCallLogs(initialCallLogs);
      }
    } else {
      setCallLogs(initialCallLogs);
    }
    setInitialized(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (initialized) {
      localStorage.setItem("voiceai_campaigns", JSON.stringify(campaigns));
      localStorage.setItem("voiceai_call_logs", JSON.stringify(callLogs));
    }
  }, [campaigns, callLogs, initialized]);

  const addCampaign = (
    newCampaign: Omit<Campaign, "id" | "stats">,
    leads?: { customerName: string; phoneNumber: string; company?: string }[]
  ) => {
    const campaignId = "c_" + Date.now();
    const campaign: Campaign = {
      ...newCampaign,
      id: campaignId,
      stats: {
        totalCalls: leads ? leads.length : 0,
        connected: 0,
        failed: 0,
        successRate: 0,
      },
    };

    setCampaigns((prev) => [campaign, ...prev]);

    if (leads && leads.length > 0) {
      const newLogs: CallLog[] = leads.map((lead, i) => ({
        id: `cl_${campaignId}_${i}_${Date.now()}`,
        customerName: lead.customerName,
        company: lead.company || "—",
        phoneNumber: lead.phoneNumber,
        duration: "0:00",
        status: "Pending",
        assignedAgent: newCampaign.assignedAgent,
        campaign: newCampaign.name,
        callDate: "—",
        transcript: "Call has not been placed yet.",
        summary: "Pending call queue.",
      }));
      setCallLogs((prev) => [...newLogs, ...prev]);
    }
  };

  const addLeadsToCampaign = (
    campaignId: string,
    leads: { customerName: string; phoneNumber: string; company?: string }[]
  ) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    const newLogs: CallLog[] = leads.map((lead, i) => ({
      id: `cl_${campaignId}_${i}_${Date.now()}`,
      customerName: lead.customerName,
      company: lead.company || "—",
      phoneNumber: lead.phoneNumber,
      duration: "0:00",
      status: "Pending",
      assignedAgent: campaign.assignedAgent,
      campaign: campaign.name,
      callDate: "—",
      transcript: "Call has not been placed yet.",
      summary: "Pending call queue.",
    }));

    setCallLogs((prev) => [...newLogs, ...prev]);

    // Update campaign stats
    setCampaigns((prevCampaigns) =>
      prevCampaigns.map((c) => {
        if (c.id === campaignId) {
          const totalCalls = c.stats.totalCalls + leads.length;
          return {
            ...c,
            stats: {
              ...c.stats,
              totalCalls,
            },
          };
        }
        return c;
      })
    );
  };

  const importCampaigns = (newCampaignsList: Omit<Campaign, "id" | "stats">[]) => {
    const parsedCampaigns: Campaign[] = newCampaignsList.map((nc, index) => ({
      ...nc,
      id: `c_imported_${index}_${Date.now()}`,
      stats: {
        totalCalls: 0,
        connected: 0,
        failed: 0,
        successRate: 0,
      },
    }));
    setCampaigns((prev) => [...parsedCampaigns, ...prev]);
  };

  return (
    <CampaignContext.Provider value={{ campaigns, callLogs, agents, addCampaign, addLeadsToCampaign, importCampaigns }}>
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
