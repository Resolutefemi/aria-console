'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/use-api'
import {
  Download, Smartphone, Loader2, AlertCircle, CheckCircle2,
  QrCode, ExternalLink, Shield, Clock,
} from 'lucide-react'

type ApkInfo = {
  available: boolean
  version?: string
  releaseName?: string
  publishedAt?: string
  downloadUrl?: string
  sizeMb?: string
  downloadCount?: number
  releaseUrl?: string
  error?: string
  buildUrl?: string
}

export default function DownloadPage() {
  const { data, loading, error } = useApi<ApkInfo>('/api/download/apk')

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Download Aria Companion</h1>
            <p className="text-[11px] text-muted-foreground">Android APK installer</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Checking latest release…</p>
          </div>
        ) : error || !data?.available ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h2 className="text-sm font-semibold text-center mb-1">APK not available yet</h2>
            <p className="text-xs text-muted-foreground text-center mb-4">
              {data?.error || error || 'No build has completed yet.'}
            </p>
            <p className="text-xs text-muted-foreground text-center mb-4">
              The APK builds automatically when code is pushed to GitHub. The first build takes about 15-20 minutes.
            </p>
            {data?.buildUrl && (
              <a
                href={data.buildUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors text-xs mx-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View build status
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Download card */}
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-base font-semibold mb-1">{data.releaseName || 'Aria Companion'}</h2>
              <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground mb-4">
                <span className="font-mono">{data.version}</span>
                <span>·</span>
                <span>{data.sizeMb} MB</span>
                <span>·</span>
                <span>{data.downloadCount || 0} downloads</span>
              </div>

              {/* QR code (generated client-side from download URL) */}
              <div className="mb-4 flex justify-center">
                <QRCodePlaceholder url={data.downloadUrl!} />
              </div>

              <p className="text-[11px] text-muted-foreground mb-4">
                Scan the QR code with your Android phone, or download directly:
              </p>

              <a
                href={data.downloadUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors w-full justify-center"
              >
                <Download className="w-4 h-4" />
                Download APK ({data.sizeMb} MB)
              </a>
            </div>

            {/* Installation instructions */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                Installation Guide
              </h3>
              <ol className="space-y-2.5 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-mono text-accent shrink-0">1.</span>
                  <span>Download the APK file using the button or QR code above.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-accent shrink-0">2.</span>
                  <span>Open the downloaded file on your Android phone. You may see a warning — tap <strong>&ldquo;Settings&rdquo;</strong> and enable <strong>&ldquo;Allow from this source&rdquo;</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-accent shrink-0">3.</span>
                  <span>Tap <strong>&ldquo;Install&rdquo;</strong> and wait for installation to complete.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-accent shrink-0">4.</span>
                  <span>Open the Aria Companion app and enter the 6-digit pairing code from your dashboard.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-accent shrink-0">5.</span>
                  <span>Grant the requested permissions (location, notifications, app usage) for full monitoring.</span>
                </li>
              </ol>
            </div>

            {/* Build info */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Build Information
              </h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="font-mono">{data.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Released</dt>
                  <dd>{data.publishedAt ? new Date(data.publishedAt).toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{data.sizeMb} MB</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Downloads</dt>
                  <dd>{data.downloadCount || 0}</dd>
                </div>
              </dl>
              <a
                href={data.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-accent hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View release notes on GitHub
              </a>
            </div>

            {/* iOS note */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-xs font-semibold mb-1">📱 iOS (iPhone/iPad)</h3>
              <p className="text-[11px] text-muted-foreground">
                iOS apps require an Apple Developer account ($99/year) for code signing.
                An IPA cannot be built without it. To install on iOS, you&apos;d need to:
              </p>
              <ol className="text-[10px] text-muted-foreground mt-2 space-y-1">
                <li>1. Join the Apple Developer Program</li>
                <li>2. Generate signing certificates</li>
                <li>3. Build with EAS: <code className="font-mono">eas build --platform ios</code></li>
                <li>4. Install via TestFlight or direct IPA download</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * QR code placeholder — generates a QR code from the URL using a free API.
 * In production, you'd use a proper QR library, but this works without deps.
 */
function QRCodePlaceholder({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  return (
    <div className="w-[200px] h-[200px] rounded-lg border border-border bg-white p-2">
      <img
        src={qrUrl}
        alt="QR code for APK download"
        width={192}
        height={192}
        className="w-full h-full"
      />
    </div>
  )
}
