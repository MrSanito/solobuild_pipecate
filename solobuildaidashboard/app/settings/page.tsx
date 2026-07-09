"use client";

import { useState } from "react";
import { Save, Globe, Bell, Shield, Key, Phone, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [showAuthId, setShowAuthId] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // General settings state
  const [workspaceName, setWorkspaceName] = useState("VoiceAI Production");
  const [timezone, setTimezone] = useState("Asia/Kolkata (UTC+5:30)");
  const [defaultCallerId, setDefaultCallerId] = useState("");

  // Vobiz integration state
  const [authId, setAuthId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [vobizPhone, setVobizPhone] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [audioEncoding, setAudioEncoding] = useState("audio/x-mulaw");
  const [sampleRate, setSampleRate] = useState("8000");
  const [l16Endian, setL16Endian] = useState("le");

  const handleSave = (section: string) => {
    if (section === "General") {
      const sanitizedName = workspaceName.trim();
      const sanitizedTz = timezone.trim();
      const sanitizedCallerId = defaultCallerId.trim();
      
      setWorkspaceName(sanitizedName);
      setTimezone(sanitizedTz);
      setDefaultCallerId(sanitizedCallerId);
      
      alert(`General settings saved! (Sanitized: Name="${sanitizedName}", Caller ID="${sanitizedCallerId}")`);
    } else if (section === "Vobiz") {
      const sanitizedAuthId = authId.trim();
      const sanitizedAuthToken = authToken.trim();
      const sanitizedPhone = vobizPhone.trim();
      const sanitizedWebhook = webhookSecret.trim();

      setAuthId(sanitizedAuthId);
      setAuthToken(sanitizedAuthToken);
      setVobizPhone(sanitizedPhone);
      setWebhookSecret(sanitizedWebhook);

      alert(`Vobiz carrier settings saved! (Sanitized: Auth ID="${sanitizedAuthId}", Phone="${sanitizedPhone}")`);
    } else {
      alert(`${section} settings saved successfully!`);
    }
  };

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
              <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="h-9 text-sm bg-muted/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Timezone</label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-9 text-sm bg-muted/50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Default Caller ID</label>
            <Input value={defaultCallerId} onChange={(e) => setDefaultCallerId(e.target.value)} className="h-9 text-sm bg-muted/50 max-w-xs font-mono" />
          </div>
          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button onClick={() => handleSave("General")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save General Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vobiz Integration */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Vobiz Integration</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Telephony carrier configuration for outbound calling</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Vobiz Auth ID</label>
              <div className="relative">
                <Input
                  type={showAuthId ? "text" : "password"}
                  placeholder="e.g. MA_Q2A5E55U"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  className="h-9 text-sm bg-muted/50 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthId(!showAuthId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showAuthId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Vobiz Auth Token</label>
              <div className="relative">
                <Input
                  type={showAuthToken ? "text" : "password"}
                  placeholder="••••••••••••••••"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="h-9 text-sm bg-muted/50 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthToken(!showAuthToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Vobiz Phone Number (Caller ID)</label>
              <div className="relative">
                <Input
                  type={showPhone ? "text" : "password"}
                  placeholder="e.g. +918071579713"
                  value={vobizPhone}
                  onChange={(e) => setVobizPhone(e.target.value)}
                  className="h-9 text-sm bg-muted/50 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPhone(!showPhone)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPhone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Webhook Secret (Optional)</label>
              <div className="relative">
                <Input
                  type={showWebhookSecret ? "text" : "password"}
                  placeholder="Webhook authentication secret key"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="h-9 text-sm bg-muted/50 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4 mt-2">
            <h4 className="text-[13px] font-medium text-foreground mb-3">Codec & Audio Stream Settings</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Audio Encoding</label>
                <select value={audioEncoding} onChange={(e) => setAudioEncoding(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="audio/x-mulaw" className="bg-neutral-900 text-foreground">audio/x-mulaw (PCM Mu-Law 8k)</option>
                  <option value="audio/x-l16" className="bg-neutral-900 text-foreground">audio/x-l16 (Linear 16-bit PCM)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Sample Rate</label>
                <select value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="8000" className="bg-neutral-900 text-foreground">8000 Hz (Telephony Default)</option>
                  <option value="16000" className="bg-neutral-900 text-foreground">16000 Hz (High Definition)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">L16 Endianness</label>
                <select value={l16Endian} onChange={(e) => setL16Endian(e.target.value)} className="flex h-9 w-full rounded-lg border border-border bg-neutral-900 text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="le" className="bg-neutral-900 text-foreground">le (Little Endian - Vobiz Default)</option>
                  <option value="be" className="bg-neutral-900 text-foreground">be (Big Endian - Network standard)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button onClick={() => handleSave("Vobiz")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save Vobiz Settings
            </Button>
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
          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button onClick={() => handleSave("Notifications")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save Notification Preferences
            </Button>
          </div>
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
            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer">
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
          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button onClick={() => handleSave("Security")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save Security Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
