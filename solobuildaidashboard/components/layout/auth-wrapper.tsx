"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, ShieldAlert, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Change password states
  const [isChangePassword, setIsChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("solobuild_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    // Verify token with backend
    fetch("/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Refresh user data in case it changed
        sessionStorage.setItem("solobuild_user", JSON.stringify(data.client));
        setIsAuthenticated(true);
      } else {
        sessionStorage.removeItem("solobuild_token");
        sessionStorage.removeItem("solobuild_user");
        setIsAuthenticated(false);
      }
    })
    .catch(() => {
      sessionStorage.removeItem("solobuild_token");
      sessionStorage.removeItem("solobuild_user");
      setIsAuthenticated(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        sessionStorage.setItem("solobuild_token", data.token);
        sessionStorage.setItem("solobuild_user", JSON.stringify(data.client));
        setIsAuthenticated(true);
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch (err) {
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          currentPassword: password, 
          newPassword 
        }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccessMsg("Password updated successfully! Please log in with your new password.");
        setTimeout(() => {
          setIsChangePassword(false);
          setPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccessMsg("");
        }, 2000);
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-neutral-400 font-sans text-sm">
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/80 backdrop-blur-md shadow-2xl text-white">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {isChangePassword ? <KeyRound className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-white">
                {isChangePassword ? "Change Password" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-xs text-neutral-400 mt-1">
                {isChangePassword 
                  ? "Verify your current password to set a new one" 
                  : "Sign in to your VoiceAI Dashboard"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isChangePassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-400">
                    <span>{successMsg}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors mt-2 cursor-pointer disabled:opacity-50 gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
                
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsChangePassword(false);
                      setError("");
                      setSuccessMsg("");
                    }} 
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">Password</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsChangePassword(true);
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors mt-2 cursor-pointer disabled:opacity-50 gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
