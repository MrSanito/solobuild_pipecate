"use client";

import { Plus, Search, MoreHorizontal, Eye, Pause, Trash2, Phone, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agents } from "@/lib/mock-data";

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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Voice Agents</h2>
          <p className="text-sm text-muted-foreground">{agents.length} agents configured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="w-52 pl-9 h-8 text-xs bg-card border-border rounded-lg"
            />
          </div>
          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Agent
          </Button>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, i) => (
          <Card key={agent.id} className="card-hover border-border bg-card overflow-hidden group">
            <CardContent className="p-0">
              {/* Colored Top Bar */}
              <div className={`h-1.5 bg-gradient-to-r ${avatarColors[i % avatarColors.length]}`} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} text-[13px] font-bold text-white shadow-sm`}>
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[14px]">{agent.name}</p>
                      <p className="text-[12px] text-muted-foreground">{agent.gender} • AI Agent</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="mr-2 h-3.5 w-3.5" />View Details</DropdownMenuItem>
                      <DropdownMenuItem><Pause className="mr-2 h-3.5 w-3.5" />Pause Agent</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" />Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <Badge variant={agent.status === "Active" ? "success" : agent.status === "Busy" ? "warning" : "secondary"}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDot(agent.status)}`} />
                    {agent.status}
                  </Badge>
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
                    <p className="text-[15px] font-bold text-foreground">{Math.round(agent.totalCalls * 0.82).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Connected</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[15px] font-bold text-foreground">{(agent.totalCalls * 3.2 / 60).toFixed(0)}h</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Talk Time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
