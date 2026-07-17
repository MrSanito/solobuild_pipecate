"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Phone, Brain, Eye, EyeOff, Loader2, Save, User } from "lucide-react";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "general" | "vobiz" | "gemini";
}

export function ProfileModal({ open, onClose, defaultTab = "general" }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "vobiz" | "gemini">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // General settings state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");
  const [phone, setPhone] = useState("");

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

  // Field show/hide states
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Load settings when modal is opened
  useEffect(() => {
    if (!open) return;

    async function fetchSettings() {
      setLoading(true);
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const clientData = await response.json();
          setName(clientData.name || "");
          setEmail(clientData.email || "");
          setTimezone(clientData.timezone || "Asia/Kolkata");
          setPhone(clientData.phone || "");

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
        console.error("Failed to load settings in profile modal:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let section = "";
    let payload: any = {};

    if (activeTab === "general") {
      section = "General";
      payload = {
        section,
        name: name.trim(),
        timezone: timezone.trim(),
        phone: phone.trim(),
      };
    } else if (activeTab === "vobiz") {
      section = "Vobiz";
      payload = {
        section,
        authId: authId.trim(),
        authToken: authToken.trim(),
        phoneNumber: vobizPhone.trim(),
        webhookSecret: webhookSecret.trim(),
        encoding: audioEncoding,
        sampleRate: Number(sampleRate),
        l16Endian,
      };
    } else if (activeTab === "gemini") {
      section = "Gemini";
      payload = {
        section,
        geminiApiKey: geminiApiKey.trim(),
      };
    }

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`${section} settings saved successfully!`);
        onClose();
      } else {
        const errData = await response.json();
        alert(`Failed to save settings: ${errData.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader className="border-b border-border/60 pb-3 mb-2">
          <DialogTitle className="text-foreground text-md font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-500" />
            Client Profile & Carrier Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Manage profile information, Vobiz integration credentials, and AI settings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[250px] gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            <p className="text-xs text-muted-foreground">Loading credentials...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tab Triggers */}
            <div className="flex border-b border-border/60 gap-1.5 p-0.5 bg-muted/30 rounded-lg">
              {[
                { id: "general", label: "Profile", icon: User },
                { id: "vobiz", label: "Vobiz", icon: Phone },
                { id: "gemini", label: "Gemini AI", icon: Brain },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Email</label>
                      <Input
                        value={email}
                        disabled
                        className="h-9 text-xs border-border bg-muted/40 text-muted-foreground font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Timezone</label>
                      <Input
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Default Caller ID</label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20 font-mono"
                        placeholder="e.g. +918071579713"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vobiz Tab */}
              {activeTab === "vobiz" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Vobiz Auth ID</label>
                      <Input
                        value={authId}
                        onChange={(e) => setAuthId(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20 font-mono"
                        placeholder="MA_XXXXXX"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Vobiz Auth Token</label>
                      <div className="relative">
                        <Input
                          type={showAuthToken ? "text" : "password"}
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                          className="h-9 text-xs border-border bg-muted/20 font-mono pr-8"
                          placeholder="Auth Token secret"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showAuthToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Vobiz Phone Number</label>
                      <Input
                        value={vobizPhone}
                        onChange={(e) => setVobizPhone(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20 font-mono"
                        placeholder="e.g. +918071579713"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Webhook Secret (Optional)</label>
                      <div className="relative">
                        <Input
                          type={showWebhookSecret ? "text" : "password"}
                          value={webhookSecret}
                          onChange={(e) => setWebhookSecret(e.target.value)}
                          className="h-9 text-xs border-border bg-muted/20 font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3 mt-1 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Codec & Audio Configuration
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-foreground block mb-1">Encoding</label>
                        <select
                          value={audioEncoding}
                          onChange={(e) => setAudioEncoding(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-muted/40 text-foreground px-2 py-0.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="audio/x-mulaw">audio/x-mulaw</option>
                          <option value="audio/x-l16">audio/x-l16</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-foreground block mb-1">Sample Rate</label>
                        <select
                          value={sampleRate}
                          onChange={(e) => setSampleRate(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-muted/40 text-foreground px-2 py-0.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="8000">8000 Hz</option>
                          <option value="16000">16000 Hz</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-foreground block mb-1">L16 Endianness</label>
                        <select
                          value={l16Endian}
                          onChange={(e) => setL16Endian(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-border bg-muted/40 text-foreground px-2 py-0.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="le">Little Endian</option>
                          <option value="be">Big Endian</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini Tab */}
              {activeTab === "gemini" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Gemini API Key</label>
                    <div className="relative">
                      <Input
                        type={showGeminiKey ? "text" : "password"}
                        placeholder="Enter Client Gemini API Key (e.g. AIzaSy...)"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="h-9 text-xs border-border bg-muted/20 font-mono pr-24"
                        required
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                        >
                          {showGeminiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <Button
                          type="button"
                          onClick={handleTestGemini}
                          disabled={testingGemini}
                          className="h-6 text-[9px] bg-neutral-800 hover:bg-neutral-700 text-white rounded px-2 cursor-pointer"
                        >
                          {testingGemini ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Test Key
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <DialogFooter className="border-t border-border/60 pt-3 mt-4 gap-2 flex justify-end">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="h-8.5 text-xs border-border rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5 px-4 font-semibold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Settings
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
