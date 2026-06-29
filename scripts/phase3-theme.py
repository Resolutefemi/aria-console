#!/usr/bin/env python3
"""Phase 3: hooks, theme, and app shell."""
import os
import subprocess
import shutil
from pathlib import Path

BACKUP = Path("/tmp/aria-backup/src")
DST = Path("/home/z/my-project/src")
os.chdir("/home/z/my-project")

def commit(msg: str, files: list[str]):
    for f in files:
        subprocess.run(["git", "add", f], check=True)
    subprocess.run(["git", "commit", "-m", msg, "--quiet"], check=True)

# 1. Hooks
shutil.copy(BACKUP / "hooks/use-mobile.ts", DST / "hooks/use-mobile.ts")
commit(
    "feat(hooks): add use-mobile hook for responsive breakpoints\n\n- Uses matchMedia to detect mobile viewport\n- SSR-safe (returns false on server)\n- Returns boolean isMobile state",
    ["src/hooks/use-mobile.ts"],
)

shutil.copy(BACKUP / "hooks/use-toast.ts", DST / "hooks/use-toast.ts")
commit(
    "feat(hooks): add use-toast hook with queue\n\n- Toast queue with auto-dismiss\n- Supports variant, title, description\n- Uses React context provider pattern",
    ["src/hooks/use-toast.ts"],
)

# 2. Theme tokens — write globals.css incrementally
# First commit: base Tailwind imports + theme variable scaffolding
globals_path = DST / "app/globals.css"
globals_path.parent.mkdir(parents=True, exist_ok=True)

globals_phase1 = '''@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
'''
globals_path.write_text(globals_phase1)
commit(
    "feat(theme): add Tailwind 4 theme scaffolding\n\n- Import tailwindcss and tw-animate-css\n- Custom dark variant\n- Map CSS variables to Tailwind color tokens\n- Radius scale (sm, md, lg, xl)",
    ["src/app/globals.css"],
)

# 3. Light theme tokens
light_theme = '''
/* Light theme — warm paper-like, evokes enterprise console */
:root {
  --radius: 0.5rem;
  --background: oklch(0.98 0.004 80);
  --foreground: oklch(0.18 0.008 60);
  --card: oklch(1 0.002 80);
  --card-foreground: oklch(0.18 0.008 60);
  --popover: oklch(1 0.002 80);
  --popover-foreground: oklch(0.18 0.008 60);
  --primary: oklch(0.28 0.02 60);
  --primary-foreground: oklch(0.98 0.004 80);
  --secondary: oklch(0.94 0.006 80);
  --secondary-foreground: oklch(0.28 0.02 60);
  --muted: oklch(0.95 0.005 80);
  --muted-foreground: oklch(0.48 0.008 60);
  --accent: oklch(0.72 0.14 65);
  --accent-foreground: oklch(0.18 0.008 60);
  --destructive: oklch(0.58 0.22 25);
  --border: oklch(0.9 0.005 80);
  --input: oklch(0.92 0.005 80);
  --ring: oklch(0.72 0.14 65);
  --chart-1: oklch(0.68 0.14 65);
  --chart-2: oklch(0.62 0.1 165);
  --chart-3: oklch(0.55 0.08 250);
  --chart-4: oklch(0.72 0.16 30);
  --chart-5: oklch(0.5 0.05 60);
  --sidebar: oklch(0.96 0.005 80);
  --sidebar-foreground: oklch(0.18 0.008 60);
  --sidebar-primary: oklch(0.28 0.02 60);
  --sidebar-primary-foreground: oklch(0.98 0.004 80);
  --sidebar-accent: oklch(0.92 0.01 65);
  --sidebar-accent-foreground: oklch(0.18 0.008 60);
  --sidebar-border: oklch(0.9 0.005 80);
  --sidebar-ring: oklch(0.72 0.14 65);
}
'''
with globals_path.open("a") as f:
    f.write(light_theme)
commit(
    "feat(theme): add warm light theme tokens\n\n- Warm paper-like background (oklch 0.98 0.004 80)\n- Earthy amber accent (oklch 0.72 0.14 65)\n- Five-color chart palette (amber, teal, slate, orange, warm grey)\n- Sidebar uses slightly darker warm tone for separation",
    ["src/app/globals.css"],
)

# 4. Dark theme tokens
dark_theme = '''
/* Dark theme — premium warm charcoal (NOT AI-purple) */
.dark {
  --radius: 0.5rem;
  --background: oklch(0.165 0.005 60);
  --foreground: oklch(0.93 0.005 70);
  --card: oklch(0.205 0.006 60);
  --card-foreground: oklch(0.93 0.005 70);
  --popover: oklch(0.205 0.006 60);
  --popover-foreground: oklch(0.93 0.005 70);
  --primary: oklch(0.95 0.005 70);
  --primary-foreground: oklch(0.205 0.006 60);
  --secondary: oklch(0.26 0.006 60);
  --secondary-foreground: oklch(0.93 0.005 70);
  --muted: oklch(0.24 0.006 60);
  --muted-foreground: oklch(0.65 0.008 60);
  --accent: oklch(0.78 0.14 70);
  --accent-foreground: oklch(0.18 0.008 60);
  --destructive: oklch(0.65 0.22 25);
  --border: oklch(0.3 0.006 60);
  --input: oklch(0.28 0.006 60);
  --ring: oklch(0.78 0.14 70);
  --chart-1: oklch(0.78 0.14 70);
  --chart-2: oklch(0.7 0.1 165);
  --chart-3: oklch(0.62 0.09 250);
  --chart-4: oklch(0.7 0.15 35);
  --chart-5: oklch(0.55 0.05 60);
  --sidebar: oklch(0.18 0.005 60);
  --sidebar-foreground: oklch(0.93 0.005 70);
  --sidebar-primary: oklch(0.78 0.14 70);
  --sidebar-primary-foreground: oklch(0.18 0.008 60);
  --sidebar-accent: oklch(0.24 0.006 60);
  --sidebar-accent-foreground: oklch(0.93 0.005 70);
  --sidebar-border: oklch(0.28 0.006 60);
  --sidebar-ring: oklch(0.78 0.14 70);
}
'''
with globals_path.open("a") as f:
    f.write(dark_theme)
commit(
    "feat(theme): add premium warm-charcoal dark theme\n\n- Background oklch 0.165 — warm charcoal, not pure black\n- Amber accent (0.78 0.14 70) — distinctive, evokes hardware LEDs\n- Avoids the typical AI-generated purple/blue gradient aesthetic\n- Earthy chart palette (amber, teal, slate, orange, warm grey)",
    ["src/app/globals.css"],
)

# 5. Base layer
base_layer = '''
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "cv11", "ss01", "ss03";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
'''
with globals_path.open("a") as f:
    f.write(base_layer)
commit(
    "feat(theme): add base layer with typography polish\n\n- Apply border-border and outline-ring globally\n- Enable Geist font features cv11, ss01, ss03\n- Antialiased text rendering (webkit + moz)",
    ["src/app/globals.css"],
)

# 6. Custom scrollbar
scrollbar_css = '''
/* Custom scrollbar — subtle, modern */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: oklch(0.35 0.005 60 / 0.4);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: oklch(0.45 0.005 60 / 0.6);
}
.dark ::-webkit-scrollbar-thumb {
  background: oklch(0.45 0.005 60 / 0.4);
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: oklch(0.55 0.005 60 / 0.6);
}
'''
with globals_path.open("a") as f:
    f.write(scrollbar_css)
commit(
    "feat(theme): add custom scrollbar styling\n\n- 8px wide, transparent track\n- Subtle thumb with hover state\n- Distinct dark mode colors\n- Replaces default OS scrollbar for visual consistency",
    ["src/app/globals.css"],
)

# 7. Animations
animations_css = '''
/* Voice waveform animation */
@keyframes waveform {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

.waveform-bar {
  animation: waveform 1.2s ease-in-out infinite;
  transform-origin: center;
}

/* Subtle pulse for live indicators */
@keyframes soft-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.live-dot {
  animation: soft-pulse 2s ease-in-out infinite;
}

/* Status dot glow */
.status-glow {
  box-shadow: 0 0 0 3px var(--glow-color, transparent);
}
'''
with globals_path.open("a") as f:
    f.write(animations_css)
commit(
    "feat(theme): add waveform, pulse, and glow animations\n\n- waveform keyframes for voice visualization bars\n- soft-pulse for live status indicators (2s cycle)\n- status-glow utility for emphasized status dots",
    ["src/app/globals.css"],
)

# 8. Focus rings
focus_css = '''
/* Focus ring for accessibility */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default outline on click for mouse users */
*:focus:not(:focus-visible) {
  outline: none;
}
'''
with globals_path.open("a") as f:
    f.write(focus_css)
commit(
    "feat(theme): add accessible focus ring styles\n\n- Visible 2px focus ring with offset for keyboard users\n- Removes outline for mouse clicks (focus without focus-visible)\n- Improves WCAG 2.4.7 (Focus Visible) compliance",
    ["src/app/globals.css"],
)

# 9. Layout with metadata
layout_content = '''import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aria Console — Voice-Controlled Smartphone System",
  description:
    "Operations console for managing voice-controlled smartphone fleets. Monitor devices, voice interactions, energy usage, and security alerts.",
  keywords: [
    "voice control",
    "smartphone",
    "device management",
    "console",
    "Aria",
  ],
  authors: [{ name: "Resolutefemi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
'''
(DST / "app/layout.tsx").write_text(layout_content)
commit(
    "feat(app): add root layout with Geist fonts and dark mode default\n\n- Geist Sans + Geist Mono via next/font\n- Default to dark theme (className=\\\"dark\\\" on html)\n- suppressHydrationWarning for theme stability\n- Toaster mounted globally\n- SEO metadata: title, description, keywords, author",
    ["src/app/layout.tsx"],
)

# 10. Initial page (placeholder)
page_content = '''export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading console…</p>
    </main>
  );
}
'''
(DST / "app/page.tsx").write_text(page_content)
commit(
    "feat(app): add placeholder home page\n\n- Will be replaced by the full dashboard in subsequent commits\n- Server component (no use client directive)\n- Minimal layout to verify build pipeline",
    ["src/app/page.tsx"],
)

print(f"Phase 3 complete. Total commits: {subprocess.run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True).stdout.strip()}")
