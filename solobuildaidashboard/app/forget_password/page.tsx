"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2 } from "lucide-react";

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
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-4 font-sans">
      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/80 backdrop-blur-md shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Reset Password</CardTitle>
          <CardDescription className="text-neutral-400">Enter your email and we'll send you a recovery link</CardDescription>
        </CardHeader>
        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300" htmlFor="email">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-10 border-neutral-800 bg-neutral-950 text-white rounded-lg text-sm"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors mt-2 disabled:opacity-50 gap-2" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-xs text-center text-neutral-400">
                Remember your password?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <>
            <CardContent>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 text-center">
                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full h-10 border-neutral-700 text-white hover:bg-neutral-800" asChild>
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
