// KPI Statistics
export const kpiStats = {
  totalCalls: 0,
  totalConversations: 0,
  callsPerMinute: 0,
  activeAgents: 0,
};

// Call Volume Chart Data (last 7 days)
export const callVolumeData: { date: string; calls: number; connected: number }[] = [];

// Agent Data
export interface Agent {
  id: string;
  name: string;
  gender: "Male" | "Female";
  status: "Active" | "Inactive" | "Busy";
  totalCalls: number;
  avatar?: string;
}

export const agents: Agent[] = [
  { id: "a1", name: "Sarah Mitchell", gender: "Female", status: "Active", totalCalls: 0 },
  { id: "a2", name: "James Rodriguez", gender: "Male", status: "Active", totalCalls: 0 },
  { id: "a3", name: "Emily Chen", gender: "Female", status: "Busy", totalCalls: 0 },
  { id: "a4", name: "Michael Brooks", gender: "Male", status: "Active", totalCalls: 0 },
  { id: "a5", name: "Priya Sharma", gender: "Female", status: "Inactive", totalCalls: 0 },
  { id: "a6", name: "David Kim", gender: "Male", status: "Active", totalCalls: 0 },
];

// Campaign Data
export interface Campaign {
  id: string;
  name: string;
  assignedAgent: string;
  purpose: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Completed" | "Paused" | "Scheduled";
  stats: {
    totalCalls: number;
    connected: number;
    failed: number;
    successRate: number;
  };
}

export const campaigns: Campaign[] = [];

// Call Log Data
export interface CallLog {
  id: string;
  customerName: string;
  company: string;
  phoneNumber: string;
  duration: string;
  status: "Completed" | "No Answer" | "Voicemail" | "Failed" | "In Progress" | "Pending";
  assignedAgent: string;
  campaign: string;
  callDate: string;
  transcript: string;
  summary: string;
}

export const callLogs: CallLog[] = [];
