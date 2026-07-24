"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { Bell, Search, Plus } from "lucide-react";
import { ProfileModal } from "@/components/modals/profile-modal";
import { useClerk } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your voice AI operations" },
  "/campaigns": { title: "Campaigns", subtitle: "Manage your calling campaigns" },
  "/call-logs": { title: "Call Logs", subtitle: "Review call history and transcripts" },
  "/agents": { title: "Agents", subtitle: "Manage your AI voice agents" },
  "/settings": { title: "Settings", subtitle: "Configure your workspace" },
};

export function Navbar() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || pageTitles["/"];
  const { signOut } = useClerk();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDefaultTab, setProfileDefaultTab] = useState<"general" | "vobiz" | "gemini">("general");

  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [userInitials, setUserInitials] = useState("U");

  useEffect(() => {
    // 1. First, quickly set user data from sessionStorage to prevent "Loading..." flicker
    const handleUpdate = () => {
      const userStr = sessionStorage.getItem("solobuild_user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name || "User");
          setUserEmail(user.email || "");
          if (user.name) {
            const initials = user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            setUserInitials(initials || "U");
          }
        } catch (e) {}
      }
    };

    handleUpdate();

    // 2. Background fetch to get fresh data just in case it updated
    async function fetchUser() {
      try {
        const response = await fetchWithAuth("/api/settings");
        if (response.ok) {
          const clientData = await response.json();
          setUserName(clientData.name || "User");
          setUserEmail(clientData.email || "");
          
          if (clientData.name) {
            const initials = clientData.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();
            setUserInitials(initials || "U");
          }

          // Sync back to sessionStorage
          const clientSafe = {
            _id: clientData._id,
            name: clientData.name,
            email: clientData.email,
            slug: clientData.slug,
            plan: clientData.plan,
          };
          sessionStorage.setItem("solobuild_user", JSON.stringify(clientSafe));
          // Dispatch event in case someone else is listening
          window.dispatchEvent(new Event("solobuild_user_updated"));
        }
      } catch (error) {
        console.error("Failed to fetch user for navbar", error);
      }
    }
    
    // Only fetch if we have a token to prevent unnecessary 401s
    if (sessionStorage.getItem("solobuild_token")) {
      fetchUser();
    }

    window.addEventListener("solobuild_user_updated", handleUpdate);
    return () => {
      window.removeEventListener("solobuild_user_updated", handleUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-8">
      {/* Page Title */}
      <div>
        <h1 className="text-base font-semibold text-foreground">{page.title}</h1>
        <p className="text-xs text-muted-foreground">{page.subtitle}</p>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search anything..."
            className="w-56 pl-9 h-8 text-xs bg-muted/50 border-border rounded-lg focus-visible:ring-primary"
          />
        </div>

        {/* New Campaign */}
        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 rounded-lg hidden sm:flex">
          <Plus className="h-3.5 w-3.5" />
          New Campaign
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-indigo-500 pulse-dot" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2 rounded-lg">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white uppercase">
                {userInitials}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { setProfileDefaultTab("general"); setIsProfileOpen(true); }} className="cursor-pointer">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Billing</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setProfileDefaultTab("gemini"); setIsProfileOpen(true); }} className="cursor-pointer">
              API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 cursor-pointer"
              onSelect={() => {
                sessionStorage.clear();
                signOut({ redirectUrl: '/' });
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ProfileModal 
          open={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          defaultTab={profileDefaultTab} 
        />
      </div>
    </header>
  );
}
