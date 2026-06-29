'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Smartphone, Copy, Check, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function PairPage() {
  const { user, dbUser, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [shortCode, setShortCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-semibold mb-2">Sign in required</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You need to be signed in to pair a device.
          </p>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </div>
    )
  }

  async function createPairing() {
    setCreating(true)
    try {
      const res = await fetch('/api/pairing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: dbUser?.id,
          deviceName: 'New Device',
          deviceType: 'PHONE',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Failed to create pairing', description: data.error, variant: 'destructive' })
      } else {
        setShortCode(data.shortCode)
        setExpiresAt(new Date(data.expiresAt))
        toast({ title: 'Pairing code created', description: 'Give this code to your child' })
      }
    } catch (e) {
      toast({ title: 'Network error', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  function copyCode() {
    if (!shortCode) return
    navigator.clipboard.writeText(shortCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Pair a device</h1>
            <p className="text-[11px] text-muted-foreground">Link a phone to your account</p>
          </div>
        </div>

        {!shortCode ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold mb-2">How pairing works</h2>
            <ol className="space-y-2 text-xs text-muted-foreground mb-4">
              <li className="flex gap-2">
                <span className="font-mono text-accent">1.</span>
                <span>Click &ldquo;Generate code&rdquo; below to get a 6-digit pairing code.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-accent">2.</span>
                <span>Open the companion app on the device you want to monitor.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-accent">3.</span>
                <span>Enter the 6-digit code in the companion app.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-accent">4.</span>
                <span>The device will appear on your dashboard and start reporting real data.</span>
              </li>
            </ol>
            <p className="text-[11px] text-muted-foreground mb-4 p-3 rounded-md bg-muted/30 border border-border">
              💡 For demo purposes, you can open the companion app simulator at{' '}
              <code className="font-mono text-accent">/companion</code> in another browser tab
              to simulate a real phone.
            </p>
            <Button onClick={createPairing} disabled={creating} className="w-full">
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating…
                </>
              ) : (
                'Generate pairing code'
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-sm font-semibold mb-1">Your pairing code</h2>
            <p className="text-[11px] text-muted-foreground mb-4">
              Enter this code on the device you want to pair
            </p>
            <button
              onClick={copyCode}
              className="w-full py-6 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors group"
            >
              <div className="text-4xl font-mono font-bold tracking-[0.3em] text-accent">
                {shortCode}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-muted-foreground group-hover:text-foreground">
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Click to copy
                  </>
                )}
              </div>
            </button>
            {expiresAt && (
              <p className="text-[10px] text-muted-foreground mt-3">
                Expires at {expiresAt.toLocaleTimeString()} ({Math.floor((expiresAt.getTime() - Date.now()) / 60000)} min left)
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Or open the companion simulator:
              </p>
              <Button
                variant="outline"
                onClick={() => window.open('/companion', '_blank')}
                className="w-full"
              >
                Open companion app →
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full text-xs"
              >
                I&apos;m done — go to dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
