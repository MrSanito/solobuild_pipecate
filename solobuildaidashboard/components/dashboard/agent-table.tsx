"use client";

import { MoreHorizontal, Eye, Pause, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { agents } from "@/lib/mock-data";

const avatarColors = [
  "from-indigo-400 to-indigo-600",
  "from-emerald-400 to-emerald-600",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-blue-600",
  "from-pink-400 to-rose-600",
  "from-violet-400 to-purple-600",
];

function getStatusVariant(status: string) {
  switch (status) {
    case "Active": return "success" as const;
    case "Busy": return "warning" as const;
    case "Inactive": return "secondary" as const;
    default: return "secondary" as const;
  }
}

interface AgentTableProps {
  onAddAgentClick?: () => void;
}

export function AgentTable({ onAddAgentClick }: AgentTableProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold text-foreground">Agent Performance</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">Your AI voice agents overview</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onAddAgentClick && (
              <Button onClick={onAddAgentClick} size="sm" className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5 cursor-pointer">
                Add Agent
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs h-8 rounded-lg">
              View All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Agent</TableHead>
              <TableHead className="text-xs">Gender</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Total Calls</TableHead>
              <TableHead className="text-xs w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent, i) => (
              <TableRow 
                key={agent.id} 
                className="group cursor-pointer hover:bg-muted/50 transition-colors border-border"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} text-[11px] font-bold text-white shadow-sm`}>
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className="font-medium text-foreground text-[13px]">{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-[13px]">{agent.gender}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(agent.status)}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                      agent.status === "Active" ? "bg-emerald-500" :
                      agent.status === "Busy" ? "bg-amber-500" : "bg-slate-400"
                    }`} />
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-foreground text-[13px]">{agent.totalCalls.toLocaleString()}</span>
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
