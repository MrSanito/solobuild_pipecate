"use client";

import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, ShieldAlert, Clock, Laptop, AlertCircle } from "lucide-react";

export default function VerifySignUpEmailLink() {
  const { signUp } = useSignUp();

  // Not loaded yet — show loading spinner
  if (!signUp) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center bg-[#030712] px-4 font-sans overflow-hidden">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <Card className="relative w-full max-w-md border-neutral-800/80 bg-neutral-950/40 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.08)] text-white overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-violet-600" />
          <CardHeader className="pt-8 pb-6">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Loading</CardTitle>
            <CardDescription className="text-neutral-400">
              Connecting to authentication server...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Safely access verification — may be undefined if no active sign-up attempt
  const verification = signUp?.verifications?.emailLinkVerification as any;

  // Determine the status — default to "no_verification" if nothing exists
  const status = verification?.status;

  // Extract error details from the verification object
  const errorMessage = verification?.error?.message
    || verification?.error?.longMessage
    || null;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#030712] px-4 font-sans overflow-hidden">
      {/* Background Aura Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <Card className="relative w-full max-w-md border-neutral-800/80 bg-neutral-950/40 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.08)] text-white overflow-hidden text-center">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-violet-600" />

        {/* --- NO ACTIVE VERIFICATION --- */}
        {!status && (
          <>
            <CardHeader className="pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  <AlertCircle className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">No Verification Found</CardTitle>
              <CardDescription className="text-neutral-400">
                There is no active email verification. Please start a new sign-up attempt.
              </CardDescription>
            </CardHeader>
            <CardFooter className="px-6 pb-8">
              <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm">
                <Link href="/register">Go to Register</Link>
              </Button>
            </CardFooter>
          </>
        )}

        {/* --- UNVERIFIED (Waiting) --- */}
        {status === "unverified" && (
          <CardHeader className="pt-8 pb-6">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Link</CardTitle>
            <CardDescription className="text-neutral-400">
              Please wait while we secure your session...
            </CardDescription>
          </CardHeader>
        )}

        {/* --- FAILED --- */}
        {status === "failed" && (
          <>
            <CardHeader className="pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  <ShieldAlert className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
              <CardDescription className="text-neutral-400">
                {errorMessage || "The email link verification has failed."}
              </CardDescription>
            </CardHeader>
            {errorMessage && (
              <CardContent className="px-6 pb-4">
                <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              </CardContent>
            )}
            <CardFooter className="px-6 pb-8">
              <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm">
                <Link href="/register">Return to Register</Link>
              </Button>
            </CardFooter>
          </>
        )}

        {/* --- EXPIRED --- */}
        {status === "expired" && (
          <>
            <CardHeader className="pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
              <CardDescription className="text-neutral-400">
                This verification link is no longer valid. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardFooter className="px-6 pb-8">
              <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm">
                <Link href="/register">Request New Link</Link>
              </Button>
            </CardFooter>
          </>
        )}

        {/* --- CLIENT MISMATCH --- */}
        {status === "client_mismatch" && (
          <>
            <CardHeader className="pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Laptop className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Browser Mismatch</CardTitle>
              <CardDescription className="text-neutral-400 text-sm leading-relaxed px-4">
                You must complete the sign-up on the same device and browser where you requested the link.
              </CardDescription>
            </CardHeader>
            <CardFooter className="px-6 pb-8">
              <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm">
                <Link href="/register">Return to Register</Link>
              </Button>
            </CardFooter>
          </>
        )}

        {/* --- VERIFIED (Success) --- */}
        {status === "verified" && (
          <CardHeader className="pt-8 pb-6">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                <MailCheck className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Verified Successfully</CardTitle>
            <CardDescription className="text-neutral-400">
              You can now close this tab and return to your original sign-up tab.
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </div>
  );
}