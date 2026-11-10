'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Smartphone,
  Mic,
  ShieldCheck,
  Loader2,
  MailCheck,
  AlertCircle,
} from 'lucide-react'

/**
 * Auth screen — light: white + purple · dark: black + purple.
 * Split layout: brand panel on the left (desktop), compact form card on
 * the right. All auth calls go through /api/auth/* with httpOnly cookies.
 */

const highlights = [
  {
    icon: Smartphone,
    title: 'Fleet at a glance',
    body: 'Live status, screen time and location for every paired device.',
  },
  {
    icon: Mic,
    title: 'Voice command telemetry',
    body: 'Every interaction captured, transcribed and searchable.',
  },
  {
    icon: ShieldCheck,
    title: 'Security you can see',
    body: 'Permission posture and instant alerts when something changes.',
  },
]

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function resetFeedback() {
    setError(null)
    setSuccess(null)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      router.push('/')
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()
    setLoading(true)
    const { error, needsConfirmation } = await signUp(email, password, name)
    setLoading(false)
    if (error) {
      setError(error)
    } else if (needsConfirmation) {
      setSuccess(
        'Account created. Check your email for a confirmation link, then sign in.'
      )
    } else {
      router.push('/')
    }
  }

  const signInError = error && !success

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Brand panel (desktop only) ─────────────────────────── */}
      <aside
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 relative overflow-hidden border-r border-border"
        aria-hidden="true"
      >
        <div className="absolute inset-0 brand-glow" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative flex flex-col justify-between p-10 xl:p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl brand-mark flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="font-mono text-xl font-bold text-primary-foreground">A</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">Aria Console</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Voice-Controlled Smartphone System
              </span>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight">
              Run your entire device fleet from{' '}
              <span className="text-primary">one console.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Monitor, control and secure voice-driven smartphones — built
              with accessibility at its core for visually impaired users.
            </p>

            <ul className="mt-10 space-y-6">
              {highlights.map((h) => {
                const Icon = h.icon
                return (
                  <li key={h.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{h.title}</div>
                      <div className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                        {h.body}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">v 4.2.1</span>
            <span aria-hidden="true">·</span>
            <span>Built by Resolute Femi</span>
          </div>
        </div>
      </aside>

      {/* ── Auth card ──────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 brand-glow decorative lg:hidden" />

        <div className="w-full max-w-[420px] relative">
          {/* Compact brand header (mobile / narrow) */}
          <div className="flex items-center gap-2.5 mb-8 justify-center lg:hidden">
            <div className="w-10 h-10 rounded-lg brand-mark flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="font-mono text-lg font-bold text-primary-foreground">A</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight">Aria Console</span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">v 4.2.1</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-primary/5 p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Sign in to manage your voice-controlled devices.
            </p>

            <Tabs defaultValue="signin" onValueChange={resetFeedback}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">
                      Name <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {signInError && (
              <Alert variant="destructive" className="mt-5">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mt-5 border-primary/30 bg-primary/5 text-primary">
                <MailCheck className="w-4 h-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center mt-5 max-w-sm mx-auto leading-relaxed">
            By continuing, you agree to the Aria Console{' '}
            <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
              terms of service
            </a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">
              privacy policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
