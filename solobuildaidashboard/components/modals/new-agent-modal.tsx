"use client";

import React, { useState } from "react";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (agent: any) => void;
}

export function NewAgentModal({ open, onClose, onSave }: NewAgentModalProps) {
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState("Puck");
  const [language, setLanguage] = useState("hi-IN");
  const [aiModel, setAiModel] = useState("gemini-3.1-flash-live-preview");
  const [temperature, setTemperature] = useState(0.6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedAgentName = agentName.trim();
    const trimmedOrgName = orgName.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedName || !trimmedAgentName || !trimmedOrgName) {
      alert("Please fill in Display Name, Agent ID, and Organization Name.");
      return;
    }

    if (onSave) {
      onSave({
        name: trimmedName,
        agentName: trimmedAgentName,
        orgName: trimmedOrgName,
        prompt: trimmedPrompt,
        voice,
        language,
        aiModel,
        temperature,
      });
    }

    // Reset
    setName("");
    setAgentName("");
    setOrgName("");
    setPrompt("");
    setVoice("Puck");
    setLanguage("hi-IN");
    setAiModel("gemini-3.1-flash-live-preview");
    setTemperature(0.6);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-md font-semibold">Configure New Voice Agent</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Define the identity, prompt instructions, and streaming audio carrier bindings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-foreground">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Agent Name (Display)</label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Kabir" className="h-9 text-sm bg-muted/50" />
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
              <Input value={agentName} onChange={e => setAgentName(e.target.value)} required placeholder="e.g. quickstart-agent" className="h-9 text-sm bg-muted/50 font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Pipecat Cloud Organization Name</label>
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} required placeholder="e.g. energetic-hippopotamus-teal-890" className="h-9 text-sm bg-muted/50 font-mono" />
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
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} placeholder="Define the character, tone rules, rules on price quotation, and flow steps..." className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y font-mono text-xs" />
          </div>

          <DialogFooter className="border-t border-border/60 pt-4 gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs rounded-lg">Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
