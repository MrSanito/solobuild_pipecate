'use client'

import { useSignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Page() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const emailAddress = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await signIn.password({ emailAddress, password })
    if (error) { console.error(JSON.stringify(error, null, 2)); return }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) { console.log(session?.currentTask); return }
          const url = decorateUrl('/dashboard')
          if (url.startsWith('http')) { window.location.href = url } else { router.push(url) }
        },
      })
    } else if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors.find((f) => f.strategy === 'email_code')
      if (emailCodeFactor) await signIn.mfa.sendEmailCode()
    } else {
      console.error('Sign-in attempt not complete:', signIn)
    }
  }

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string

    await signIn.mfa.verifyEmailCode({ code })

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) { console.log(session?.currentTask); return }
          const url = decorateUrl('/dashboard')
          if (url.startsWith('http')) { window.location.href = url } else { router.push(url) }
        },
      })
    } else {
      console.error('Sign-in attempt not complete:', signIn)
    }
  }

  useEffect(() => {
    if (isSignedIn) router.replace('/dashboard')
  }, [isSignedIn, router])

  if (isSignedIn) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-xs">Redirecting...</span>
        </div>
      </div>
    )
  }

  if (signIn.status === 'complete') return null

  // ── PHASE 2: MFA Verification ──
  if (signIn.status === 'needs_client_trust') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Verify your identity</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Enter the code sent to your email</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {errors?.global && errors.global.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{errors.global.map((e: any) => e.message).join('. ')}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="code">Verification Code</label>
              <Input
                id="code" name="code" type="text" placeholder="000000" autoComplete="one-time-code"
                className="h-10 border-border bg-card text-foreground text-center tracking-[0.4em] font-mono text-base placeholder:tracking-normal placeholder:text-muted rounded-lg focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50"
              />
            </div>

            <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg gap-2 disabled:opacity-40" type="submit" disabled={fetchStatus === 'fetching'}>
              {fetchStatus === 'fetching' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Verifying...</> : 'Verify'}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={() => signIn.mfa.sendEmailCode()} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className="h-3 w-3" />Resend code
              </button>
              <button type="button" onClick={() => signIn.reset()} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Start over
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── PHASE 1: Sign In Form ──
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-primary font-bold text-sm tracking-tight">SB</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Sign in to SoloBuild</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter your credentials to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors?.global && errors.global.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">{errors.global.map((err: any, i: number) => <p key={i}>{err.message}</p>)}</div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="email">Email</label>
            <Input
              id="email" type="email" name="email" placeholder="name@company.com" required
              className={`h-10 border-border bg-card text-foreground rounded-lg text-sm placeholder:text-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50 transition-colors ${errors?.fields?.identifier ? 'border-destructive/60' : ''}`}
            />
            {errors?.fields?.identifier && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" />{errors.fields.identifier.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Forgot password?</Link>
            </div>
            <div className="relative">
              <Input
                id="password" type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••" required
                className={`h-10 pr-10 border-border bg-card text-foreground rounded-lg text-sm placeholder:text-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary/50 transition-colors ${errors?.fields?.password ? 'border-destructive/60' : ''}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors?.fields?.password && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" />{errors.fields.password.message}
              </p>
            )}
          </div>

          <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg gap-2 disabled:opacity-40 mt-2" type="submit" disabled={fetchStatus === 'fetching'}>
            {fetchStatus === 'fetching' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Signing in...</> : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">Create one</Link>
        </p>

        <div className="mt-8 border-t border-border" />
        <p className="mt-4 text-center text-[10px] text-muted-foreground/40">Protected by SoloBuild AI</p>
      </div>
    </div>
  )
}