#!/bin/bash
# Phase 1: Project scaffold (commits 1-15)
set -e
cd /home/z/my-project

GIT() { git "$@"; }
ADD() { git add "$@" 2>/dev/null || true; }
COMMIT() { git commit -m "$1" --quiet; }

# 1
ADD .gitignore
COMMIT "chore: initialize git repository with .gitignore

- Ignore node_modules, .next, .env, build artifacts
- Ignore local SQLite databases
- Ignore IDE files (.vscode, .idea)
- Ignore dev.log and server.log
- Standard Next.js + TypeScript patterns"

# 2 - License
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Resolutefemi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
ADD LICENSE
COMMIT "docs: add MIT license"

# 3 - README scaffold
cat > README.md << 'EOF'
# Aria Console

Operations dashboard for a voice-controlled smartphone system.

> Status: Work in progress

## Overview

Aria Console is a web-based operations console for monitoring and managing a
fleet of voice-controlled smartphone devices. It surfaces device health, voice
interaction telemetry, energy consumption, and security alerts in a single
interface designed for both quick triage and deep investigation.

## Tech stack

- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (New York style)
- Prisma ORM
- Recharts
- Lucide icons

## Getting started

Setup instructions will be added as the project matures.
EOF
ADD README.md
COMMIT "docs: scaffold README with project overview"

# 4 - package.json
cp /tmp/aria-backup/package.json .
ADD package.json
COMMIT "chore: add package.json with project dependencies

- Next.js 16, React 19, TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma 6 + @prisma/client
- Recharts for data visualization
- Lucide icons
- Framer Motion for animations
- Zustand for client state
- TanStack Query + Table"

# 5 - tsconfig
cp /tmp/aria-backup/tsconfig.json .
ADD tsconfig.json
COMMIT "chore: configure TypeScript with strict mode and path aliases

- strict: true, noUncheckedIndexedAccess: true
- @/* path alias to ./src/*
- Next.js plugin enabled
- Bundler module resolution"

# 6 - next.config
cp /tmp/aria-backup/next.config.ts .
ADD next.config.ts
COMMIT "chore: add Next.js 16 configuration

- React strict mode enabled
- Standalone output for production deployment
- Sharp for image optimization"

# 7 - tailwind config
cp /tmp/aria-backup/tailwind.config.ts .
ADD tailwind.config.ts
COMMIT "chore: add Tailwind CSS 4 configuration

- Container settings
- Plugin integration hooks
- Dark mode variant"

# 8 - postcss
cp /tmp/aria-backup/postcss.config.mjs .
ADD postcss.config.mjs
COMMIT "chore: add PostCSS configuration for Tailwind 4"

# 9 - components.json
cp /tmp/aria-backup/components.json .
ADD components.json
COMMIT "chore: add shadcn/ui components.json (New York style)

- Style: new-york
- Icon set: lucide
- Aliases configured for @/components, @/lib"

# 10 - eslint
cp /tmp/aria-backup/eslint.config.mjs .
ADD eslint.config.mjs
COMMIT "chore: add ESLint flat config with Next.js rules

- Next.js core-web-vitals plugin
- TypeScript plugin
- React hooks rules"

# 11 - Caddyfile
cp /tmp/aria-backup/Caddyfile .
ADD Caddyfile
COMMIT "chore: add Caddy gateway configuration

- Single-port external exposure
- XTransformPort routing for mini-services
- WebSocket support"

# 12 - bun.lock
cp /tmp/aria-backup/bun.lock .
ADD bun.lock
COMMIT "chore: add bun.lock for reproducible installs"

# 13 - .env.example
cat > .env.example << 'EOF'
# ─────────────────────────────────────────────────────────────
# Aria Console — Environment Variables
# ─────────────────────────────────────────────────────────────
# Copy this file to `.env` and fill in the values.
# NEVER commit your real `.env` file.

# ── Database (local SQLite for development) ─────────────────
DATABASE_URL="file:./prisma/dev.db"

# ── Supabase (production) ───────────────────────────────────
# Replace the local DATABASE_URL with the Supabase Postgres URL
# when deploying. Format:
# DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
#
# Direct connection (for Prisma migrations):
# DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

# Supabase client keys (safe for browser — used by @supabase/supabase-js)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Server-only key with elevated permissions (NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# ── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="Aria Console"
NEXT_PUBLIC_APP_VERSION="4.2.1"
NODE_ENV="development"
EOF
ADD .env.example
COMMIT "chore: add .env.example with Supabase + Prisma variables

- DATABASE_URL for Prisma (SQLite local / Postgres Supabase)
- DIRECT_URL for Supabase migration connection
- NEXT_PUBLIC_SUPABASE_URL + ANON_KEY for client SDK
- SUPABASE_SERVICE_ROLE_KEY for server-side admin operations
- App metadata variables"

# 14 - directory structure
mkdir -p src/app src/components/ui src/components/dashboard src/lib src/hooks prisma public download
ADD src
COMMIT "chore: scaffold src/ directory structure

- src/app for Next.js App Router
- src/components/ui for shadcn primitives
- src/components/dashboard for feature components
- src/lib for utilities
- src/hooks for custom hooks
- prisma/ for schema and migrations
- public/ for static assets
- download/ for user-facing deliverables"

# 15 - utils
cat > src/lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names with conflict resolution.
 * Combines clsx (conditional) and tailwind-merge (dedupe).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF
ADD src/lib/utils.ts
COMMIT "feat(lib): add cn() class name merge utility

- clsx for conditional class composition
- tailwind-merge for conflict resolution
- Standard shadcn/ui pattern"

echo "Phase 1 complete: $(git log --oneline | wc -l) commits"
