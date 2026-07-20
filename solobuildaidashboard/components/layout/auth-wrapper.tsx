"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  
  const isAuthPage = pathname === "/login" || pathname === "/forget_password";

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

  useEffect(() => {
    if (isAuthenticated === false && !isAuthPage) {
      router.push("/login");
    } else if (isAuthenticated === true && isAuthPage) {
      router.push("/");
    }
  }, [isAuthenticated, isAuthPage, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-neutral-400 font-sans text-sm">
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated && !isAuthPage) {
    // Show a loading state while redirecting
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-neutral-400 font-sans text-sm">
        Redirecting to login...
      </div>
    );
  }

  // If we are on an auth page but authenticated, redirect to dashboard
  if (isAuthenticated && isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-neutral-400 font-sans text-sm">
        Redirecting to dashboard...
      </div>
    );
  }

  return <>{children}</>;
}
