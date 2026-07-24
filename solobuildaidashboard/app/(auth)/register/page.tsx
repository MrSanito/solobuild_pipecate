'use client'

import { useAuth, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Page() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    const emailAddress = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string

    const { error } = await signUp.password({
      emailAddress,
      password,
      firstName,
      lastName,
      unsafeMetadata: {
        role: "client"
        
      }
    })
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      return
    }

    if (!error) await signUp.verifications.sendEmailCode()
  }

  const handleVerify = async (formData: FormData) => {
    const code = formData.get('code') as string

    await signUp.verifications.verifyEmailCode({
      code,
    })
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask)
            return
          }

          const url = decorateUrl('/')
          if (url.startsWith('http')) {
            window.location.href = url
          } else {
            router.push(url)
          }
        },
      })

      // Create user in our DB after Clerk session is active
      await fetch('/api/users/create', { method: 'POST' })
    } else {
      console.error('Sign-up attempt not complete:', signUp)
    }
  }

  useEffect(() => {
    if (signUp.status === 'complete' || isSignedIn) {
      router.push('/')
    }
  }, [signUp.status, isSignedIn, router])

  if (signUp.status === 'complete' || isSignedIn) {
    return null
  }

  // ── PHASE 2: Email Verification Code ──
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center bg-[#030712] px-4 font-sans overflow-hidden">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <Card className="relative w-full max-w-md border-neutral-800/80 bg-neutral-950/40 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.08)] text-white overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.12)]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-violet-600" />

          <CardHeader className="text-center space-y-3 pt-8 pb-6">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent">
                Verify Email
              </CardTitle>
              <CardDescription className="text-neutral-400 text-sm">
                Enter the verification code sent to your email
              </CardDescription>
            </div>
          </CardHeader>

          <form action={handleVerify}>
            <CardContent className="space-y-5 px-6 pb-6">
              {/* Global errors */}
              {errors?.global && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span className="leading-relaxed">{errors.global.map((e: any) => e.message).join('. ')}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-neutral-400" htmlFor="code">
                  Verification Code
                </label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                  className={`h-11 border-neutral-800/80 bg-neutral-950/80 text-white rounded-lg text-sm text-center tracking-[0.3em] font-mono text-lg placeholder:text-neutral-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus-visible:ring-1 transition-all duration-200 ${
                    errors?.fields?.code
                      ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30'
                      : 'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30'
                  }`}
                />
                {errors?.fields?.code && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.fields.code.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="px-6 pb-8 flex flex-col space-y-4">
              <Button
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] active:scale-[0.99] gap-2 cursor-pointer disabled:opacity-50"
                type="submit"
                disabled={fetchStatus === 'fetching'}
              >
                {fetchStatus === 'fetching' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <button
                type="button"
                onClick={() => signUp.verifications.sendEmailCode()}
                className="text-xs text-neutral-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Resend verification code
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // ── PHASE 1: Sign Up Form ──
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#030712] px-4 font-sans overflow-hidden">
      {/* Background Aura Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <Card className="relative w-full max-w-md border-neutral-800/80 bg-neutral-950/40 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.08)] text-white overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(99,102,241,0.12)]">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-violet-600" />

        <CardHeader className="text-center space-y-3 pt-8 pb-6">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-400 pulse-dot" />
              VoiceAI Platform
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <CardDescription className="text-neutral-400 text-sm">
              Register to configure your SoloBuild AI Agents
            </CardDescription>
          </div>
        </CardHeader>

        <form action={handleSubmit}>
          <CardContent className="space-y-5 px-6 pb-6">
            {/* Global errors banner */}
            {errors?.global && errors.global.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="leading-relaxed space-y-1">
                  {errors.global.map((err: any, i: number) => (
                    <p key={i}>{err.message}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* First Name field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-neutral-400" htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <Input
                    id="firstName"
                    type="text"
                    name="firstName"
                    placeholder="John"
                    required
                    className={`h-11 border-neutral-800/80 bg-neutral-950/80 text-white rounded-lg text-sm placeholder:text-neutral-600 focus-visible:ring-1 transition-all duration-200 ${
                      errors?.fields?.firstName
                        ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30'
                        : 'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30'
                    }`}
                  />
                </div>
                {errors?.fields?.firstName && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.fields.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-neutral-400" htmlFor="lastName">
                  Last Name
                </label>
                <div className="relative">
                  <Input
                    id="lastName"
                    type="text"
                    name="lastName"
                    placeholder="Doe"
                    required
                    className={`h-11 border-neutral-800/80 bg-neutral-950/80 text-white rounded-lg text-sm placeholder:text-neutral-600 focus-visible:ring-1 transition-all duration-200 ${
                      errors?.fields?.lastName
                        ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30'
                        : 'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30'
                    }`}
                  />
                </div>
                {errors?.fields?.lastName && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {errors.fields.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-neutral-400" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  required
                  className={`pl-10.5 h-11 border-neutral-800/80 bg-neutral-950/80 text-white rounded-lg text-sm placeholder:text-neutral-600 focus-visible:ring-1 transition-all duration-200 ${
                    errors?.fields?.emailAddress
                      ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30'
                      : 'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30'
                  }`}
                />
              </div>
              {errors?.fields?.emailAddress && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.fields.emailAddress.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-neutral-400" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  required
                  className={`pl-10.5 pr-10.5 h-11 border-neutral-800/80 bg-neutral-950/80 text-white rounded-lg text-sm placeholder:text-neutral-600 focus-visible:ring-1 transition-all duration-200 ${
                    errors?.fields?.password
                      ? 'border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30'
                      : 'focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors?.fields?.password && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {errors.fields.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="px-6 pb-8 flex flex-col space-y-4">
            <Button
              className="w-full h-11 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.3)] active:scale-[0.99] gap-2 cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={fetchStatus === 'fetching'}
            >
              {fetchStatus === 'fetching' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            <p className="text-xs text-neutral-400 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>

        {/* Required for sign-up flows. Clerk's bot sign-up protection is enabled by default */}
        <div id="clerk-captcha" />
      </Card>
    </div>
  )
}