'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function DashboardRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Small delay to allow the session to fully initialize and to show the message
    const timer = setTimeout(() => {
      router.push('/')
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#030712] text-white">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <h1 className="text-xl font-medium tracking-tight">Redirecting to dashboard...</h1>
        <p className="text-sm text-neutral-400">Setting up your account...</p>
      </div>
    </div>
  )
}
