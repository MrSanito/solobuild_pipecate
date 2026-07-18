"use client";

import { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Eye, Pause, Trash2, Phone, CheckCircle, Clock, Save, Edit3, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// Initial list starting with a realistic agent configured based on Showtime Expo
const initialAgents = [
  {
    id: "a1",
    name: "Kabir",
    gender: "Male",
    status: "Active",
    totalCalls: 124,
    agentName: "quickstart-agent",
    orgName: "energetic-hippopotamus-teal-890",
    prompt: "# ── SHOWTIME EVENTS - CORE KNOWLEDGE BASE (KB) ──\n\n## 1. EVENT PROFILE & BACKGROUND (BRIEF POINTERS)\n- Event Name: Showtime Global Trade & Logistics Expo\n- Dates: August 7th to August 9th (3-Day B2B Expo)\n- Venue: BKC, Mumbai\n\n## 2. ACTIONS & PRICING RULES\n- Standard Stall: Eighty-five thousand rupees total for all three days.\n- Premium Corner / Raw Space: One lakh ten thousand rupees total for all three days.\n\n# ── SHOWTIME EVENTS - CONVERSATIONAL PIPELINE ──\n\n# SECTION 1: PERSONA & TONAL AUTHENTICITY\nYou are Kabir, a sharp, corporate, and highly professional Event Consultant representing Showtime Events.\n- Language Profile: Speak in modern, urban Hinglish/Conversational Hindi.\n- Strict Rule: Absolutely NO textbook, rigid Hindi words (e.g., avoid \"स्थान\", \"मूल्य\"). Use everyday industrial business vocabulary.",
    voice: "Puck",
    language: "hi-IN",
    aiModel: "gemini-3.1-flash-live-preview",
    temperature: 0.6,
  }
];

const avatarColors = [
  "from-indigo-400 to-indigo-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-600",
  "from-pink-400 to-rose-600",
  "from-violet-400 to-purple-600",
];

function getStatusDot(status: string) {
  switch (status) {
    case "Active": return "bg-emerald-500";
    case "Busy": return "bg-amber-500";
    case "Inactive": return "bg-slate-400";
    default: return "bg-slate-400";
  }
}

export default function AgentsPage() {
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgentsList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch agents", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Form states
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState("Puck");
  const [language, setLanguage] = useState("hi-IN");
  const [aiModel, setAiModel] = useState("gemini-3.1-flash-live-preview");
  const [temperature, setTemperature] = useState(0.6);

  const handleOpenAdd = () => {
    setEditingAgent(null);
    setName("");
    setAgentName("");
    setOrgName("");
    setPrompt("");
    setVoice("Puck");
    setLanguage("hi-IN");
    setAiModel("gemini-3.1-flash-live-preview");
    setTemperature(0.6);
    setIsOpen(true);
  };

  const handleOpenEdit = (agent: any) => {
    setEditingAgent(agent);
    setName(agent.name);
    setAgentName(agent.agentName || "");
    setOrgName(agent.orgName || "");
    setPrompt(agent.prompt || "");
    setVoice(agent.voice || "Puck");
    setLanguage(agent.language || "hi-IN");
    setAiModel(agent.aiModel || "gemini-3.1-flash-live-preview");
    setTemperature(agent.temperature || 0.6);
    setIsOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedAgentName = agentName.trim();
    const trimmedOrgName = orgName.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedName || !trimmedAgentName || !trimmedOrgName) {
      alert("Please fill in Name, Agent Name and Org Name.");
      return;
    }

    const payload = {
      id: editingAgent?.id && editingAgent.id.length === 24 ? editingAgent.id : undefined,
      name: trimmedName,
      agentName: trimmedAgentName,
      orgName: trimmedOrgName,
      prompt: trimmedPrompt,
      voice,
      language,
      aiModel,
      temperature
    };

    try {
      const res = await fetch('/api/agents', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await fetchAgents();
        setIsOpen(false);
      } else {
        const data = await res.json();
        alert(`Failed to save agent: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save agent", error);
      alert("Failed to save agent");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this agent?")) {
      // If it's a dummy id from initial state, just remove it from local state
      if (id.startsWith('a')) {
        setAgentsList(agentsList.filter(a => a.id !== id));
        return;
      }
      
      try {
        const res = await fetch(`/api/agents/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setAgentsList(agentsList.filter(a => a.id !== id));
        } else {
          const data = await res.json();
          alert(`Failed to delete agent: ${data.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Failed to delete agent", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Voice Agents</h2>
          <p className="text-sm text-muted-foreground">{agentsList.length} agents configured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="w-52 pl-9 h-8 text-xs bg-card border-border rounded-lg"
            />
          </div>
          <Button onClick={handleOpenAdd} size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5 cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agentsList.map((agent, i) => (
          <Card key={agent.id} className="card-hover border-border bg-card overflow-hidden group">
            <CardContent className="p-0">
              {/* Colored Top Bar */}
              <div className={`h-1.5 bg-gradient-to-r ${avatarColors[i % avatarColors.length]}`} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} text-[13px] font-bold text-white shadow-sm`}>
                      {agent.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[14px]">{agent.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono font-medium opacity-80 mt-0.5">{agent.agentName}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(agent)} className="cursor-pointer">
                        <Settings className="mr-2 h-3.5 w-3.5" />Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(agent.id)} className="text-red-600 cursor-pointer">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant={agent.status === "Active" ? "success" : agent.status === "Busy" ? "warning" : "secondary"}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDot(agent.status)}`} />
                    {agent.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">{agent.voice} • {agent.language}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{agent.totalCalls.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Calls</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <CheckCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{(agent.connectedCalls || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{Math.floor((agent.talkTimeSeconds || 0) / 60)}m {(agent.talkTimeSeconds || 0) % 60}s</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Talk Time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog for Add/Edit Agent */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-md font-semibold">
              {editingAgent ? "Edit Agent Settings" : "Configure New Voice Agent"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the identity, prompt instructions, and streaming audio carrier bindings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-foreground">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Agent Name (Display)</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kabir" className="h-9 text-sm bg-muted/50" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">AI Model</label>
                <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="gemini-3.1-flash-live-preview" className="bg-neutral-900 text-foreground">gemini-3.1-flash-live-preview (Hinglish/Real-time Low Latency)</option>
                  <option value="gemini-2.0-flash-exp" className="bg-neutral-900 text-foreground">gemini-2.0-flash-exp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Pipecat Cloud Agent ID</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. quickstart-agent" className="h-9 text-sm bg-muted/50 font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Pipecat Cloud Organization Name</label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. energetic-hippopotamus-teal-890" className="h-9 text-sm bg-muted/50 font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Voice Accent</label>
                <select value={voice} onChange={e => setVoice(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="Puck" className="bg-neutral-900 text-foreground">Puck (Male / Hindi-English Accent)</option>
                  <option value="Charon" className="bg-neutral-900 text-foreground">Charon (Male / Deep Tone)</option>
                  <option value="Kore" className="bg-neutral-900 text-foreground">Kore (Female / Friendly Tone)</option>
                  <option value="Fenrir" className="bg-neutral-900 text-foreground">Fenrir (Male / Bold Accent)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Language Profile</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="hi-IN" className="bg-neutral-900 text-foreground">Hinglish / Conversational Hindi (hi-IN)</option>
                  <option value="en-US" className="bg-neutral-900 text-foreground">English - United States (en-US)</option>
                  <option value="en-IN" className="bg-neutral-900 text-foreground">English - India (en-IN)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Temperature ({temperature})</label>
                <input type="range" min="0.1" max="1.0" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full mt-2.5 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1.5 block">System Persona & Prompt Instruction</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} placeholder="Define the character, tone rules, rules on price quotation, and flow steps..." className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y font-mono text-xs" />
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-4 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs rounded-lg">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5 cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
