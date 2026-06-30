"use client";

import { Save, Globe, Bell, Shield, Key, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      {/* General Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Globe className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">General</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Workspace configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Workspace Name</label>
              <Input defaultValue="VoiceAI Production" className="h-9 text-sm bg-muted/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Timezone</label>
              <Input defaultValue="Asia/Kolkata (UTC+5:30)" className="h-9 text-sm bg-muted/50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Default Caller ID</label>
            <Input defaultValue="+1 (800) 555-0199" className="h-9 text-sm bg-muted/50 max-w-xs font-mono" />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Bell className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Notifications</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">How you receive alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Campaign completed", desc: "Get notified when a campaign finishes", enabled: true },
            { label: "Failed calls threshold", desc: "Alert when failure rate exceeds 10%", enabled: true },
            { label: "Agent went inactive", desc: "Notification when an agent stops responding", enabled: false },
            { label: "Weekly summary", desc: "Digest of weekly performance metrics", enabled: true },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/50/50 transition-colors">
              <div>
                <p className="text-[13px] font-medium text-foreground">{n.label}</p>
                <p className="text-[11px] text-muted-foreground">{n.desc}</p>
              </div>
              <div
                className={`relative w-10 h-[22px] rounded-full cursor-pointer transition-colors ${n.enabled ? "bg-indigo-500" : "bg-slate-200"}`}
              >
                <div
                  className={`absolute top-[3px] h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${n.enabled ? "translate-x-[22px]" : "translate-x-[3px]"}`}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Key className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-semibold text-foreground">API Keys</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Manage your API access</CardDescription>
              </div>
            </div>
            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg">
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "Production Key", key: "sk-prod-****...3f9a", created: "Jun 1, 2026", status: "Active" },
            { name: "Development Key", key: "sk-dev-****...8b2c", created: "May 15, 2026", status: "Active" },
            { name: "Legacy Key", key: "sk-leg-****...1d4e", created: "Jan 3, 2026", status: "Expired" },
          ].map((k) => (
            <div key={k.name} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{k.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{k.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground">{k.created}</span>
                <Badge variant={k.status === "Active" ? "success" : "secondary"}>
                  {k.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <Shield className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Security</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Account security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-[11px] text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Badge variant="success">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Session Timeout</p>
              <p className="text-[11px] text-muted-foreground">Automatically log out after inactivity</p>
            </div>
            <span className="text-[13px] font-medium text-muted-foreground">30 minutes</span>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
