import { NextResponse } from 'next/server'

const REPO_OWNER = 'Resolutefemi'
const REPO_NAME = 'aria-console'

/**
 * GET /api/download/apk
 * Returns the latest APK download URL from GitHub Releases.
 */
export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Aria-Console',
        },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        {
          available: false,
          error: 'No release found yet. The first build may still be running.',
          buildUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`,
        },
        { status: 404 }
      )
    }

    const release = await res.json()

    const apkAsset = release.assets?.find(
      (asset: any) => asset.name === 'aria-companion.apk' || asset.name.endsWith('.apk')
    )

    if (!apkAsset) {
      return NextResponse.json(
        {
          available: false,
          error: 'APK not found in latest release',
          releaseUrl: release.html_url,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      available: true,
      version: release.tag_name,
      releaseName: release.name,
      publishedAt: release.published_at,
      downloadUrl: apkAsset.browser_download_url,
      sizeBytes: apkAsset.size,
      sizeMb: (apkAsset.size / (1024 * 1024)).toFixed(1),
      downloadCount: apkAsset.download_count,
      releaseUrl: release.html_url,
      body: release.body,
    })
  } catch (error) {
    console.error('GET /api/download/apk error:', error)
    return NextResponse.json(
      {
        available: false,
        error: 'Failed to fetch release info',
        buildUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`,
      },
      { status: 500 }
    )
  }
}
