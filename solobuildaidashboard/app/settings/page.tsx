"use client";

import { useState, useEffect } from "react";
import { Save, Globe, Bell, Shield, Key, Phone, Eye, EyeOff, Brain, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [showAuthId, setShowAuthId] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

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

  // Gemini settings state
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [testingGemini, setTestingGemini] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load client settings from DB on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const clientData = await response.json();
          setWorkspaceName(clientData.name || "VoiceAI Production");
          setTimezone(clientData.timezone || "Asia/Kolkata");
          setDefaultCallerId(clientData.phone || "");

          if (clientData.vobiz) {
            setAuthId(clientData.vobiz.authId || "");
            setAuthToken(clientData.vobiz.authToken || "");
            setVobizPhone(clientData.vobiz.phoneNumber || "");
            setWebhookSecret(clientData.vobiz.webhookSecret || "");
            setAudioEncoding(clientData.vobiz.encoding || "audio/x-mulaw");
            setSampleRate(String(clientData.vobiz.sampleRate || 8000));
            setL16Endian(clientData.vobiz.l16Endian || "le");
          }
          setGeminiApiKey(clientData.geminiApiKey || "");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (section: string) => {
    let payload: any = { section };

    if (section === "General") {
      const sanitizedName = workspaceName.trim();
      const sanitizedTz = timezone.trim();
      const sanitizedCallerId = defaultCallerId.trim();

      setWorkspaceName(sanitizedName);
      setTimezone(sanitizedTz);
      setDefaultCallerId(sanitizedCallerId);

      payload.name = sanitizedName;
      payload.timezone = sanitizedTz;
      payload.phone = sanitizedCallerId;
    } else if (section === "Vobiz") {
      const sanitizedAuthId = authId.trim();
      const sanitizedAuthToken = authToken.trim();
      const sanitizedPhone = vobizPhone.trim();
      const sanitizedWebhook = webhookSecret.trim();

      setAuthId(sanitizedAuthId);
      setAuthToken(sanitizedAuthToken);
      setVobizPhone(sanitizedPhone);
      setWebhookSecret(sanitizedWebhook);

      payload.authId = sanitizedAuthId;
      payload.authToken = sanitizedAuthToken;
      payload.phoneNumber = sanitizedPhone;
      payload.webhookSecret = sanitizedWebhook;
      payload.encoding = audioEncoding;
      payload.sampleRate = Number(sampleRate);
      payload.l16Endian = l16Endian;
    } else if (section === "Gemini") {
      const sanitizedGeminiKey = geminiApiKey.trim();
      setGeminiApiKey(sanitizedGeminiKey);
      payload.geminiApiKey = sanitizedGeminiKey;
    }

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`${section} settings saved successfully!`);
      } else {
        const errData = await response.json();
        alert(`Failed to save settings: ${errData.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiApiKey.trim()) {
      alert("Please enter a Gemini API Key first.");
      return;
    }

    setTestingGemini(true);
    try {
      const response = await fetch("/api/settings/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiApiKey.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert("Success: Gemini API key is valid and connected!");
      } else {
        alert(`Error testing key: ${data.error || "Failed to validate key"}`);
      }
    } catch (err: any) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setTestingGemini(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

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



      {/* Gemini AI Config */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-[15px] font-semibold text-foreground">Gemini AI Configuration</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">Client-specific Gemini API settings for call analysis and real-time AI agents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Gemini API Key</label>
            <div className="relative">
              <Input
                type={showGeminiKey ? "text" : "password"}
                placeholder="Enter Gemini API Key (e.g. AIzaSy...)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="h-9 text-sm bg-muted/50 font-mono pr-28"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <Button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={testingGemini}
                  size="sm"
                  className="h-7 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-white rounded cursor-pointer"
                >
                  {testingGemini ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Test Key
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-3 border-t border-border/40">
            <Button onClick={() => handleSave("Gemini")} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-lg text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              Save Gemini Settings
            </Button>
          </div>
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
