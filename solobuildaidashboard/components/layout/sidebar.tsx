"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Call Logs", href: "/call-logs", icon: PhoneCall },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
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
    </aside>
  );
}
