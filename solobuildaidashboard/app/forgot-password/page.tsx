"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call to send reset email
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isSubmitted ? 'Check your inbox' : 'Reset your password'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSubmitted
              ? `We sent a recovery link to ${email}`
              : "We'll send you a link to reset your password"}
          </p>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 border-border bg-card text-foreground rounded-lg text-sm placeholder:text-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50 transition-colors"
              />
            </div>

            <Button
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg gap-2 disabled:opacity-40"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending...</>
              ) : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account exists for <strong className="text-foreground">{email}</strong>, you'll receive a password reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-10 border-border bg-transparent text-foreground hover:bg-muted text-sm rounded-lg transition-colors"
              asChild
            >
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        )}

        {!isSubmitted && (
          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        )}

        <div className="mt-8 border-t border-border" />
        <p className="mt-4 text-center text-[10px] text-muted-foreground/40">Protected by SoloBuild AI</p>
      </div>
    </div>
  );
}
