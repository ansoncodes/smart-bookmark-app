import { NextRequest, NextResponse } from 'next/server'

interface PreviewData {
  title: string
  description: string
  image: string | null
  favicon: string | null
}

// In-memory cache — persists for the lifetime of the server process
const cache = new Map<string, PreviewData>()

function extractMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return decodeHTMLEntities(match[1].trim())
    }
  }
  return null
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function parseMetadata(html: string, url: string): PreviewData {
  // Extract title: prefer og:title, then twitter:title, then <title>
  const title =
    extractMetaContent(html, [
      /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']og:title["']/i,
    ]) ??
    extractMetaContent(html, [
      /<meta\s+(?:property|name)=["']twitter:title["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']twitter:title["']/i,
    ]) ??
    extractMetaContent(html, [
      /<title[^>]*>([^<]*)<\/title>/i,
    ]) ??
    ''

  // Extract description: prefer og:description, then meta description
  const description =
    extractMetaContent(html, [
      /<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']og:description["']/i,
    ]) ??
    extractMetaContent(html, [
      /<meta\s+name=["']description["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+name=["']description["']/i,
    ]) ??
    ''

  // Extract og:image, also try twitter:image
  const image =
    extractMetaContent(html, [
      /<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']og:image["']/i,
      /<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']*?)["']/i,
      /<meta\s+content=["']([^"']*?)["']\s+(?:property|name)=["']twitter:image["']/i,
    ])

  // Resolve relative image URLs
  let resolvedImage = image
  if (image && !image.startsWith('http')) {
    try {
      resolvedImage = new URL(image, url).href
    } catch {
      resolvedImage = null
    }
  }

  // Build favicon URL
  let favicon: string | null = null
  try {
    const urlObj = new URL(url)
    favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`
  } catch {
    // ignore
  }

  return {
    title,
    description,
    image: resolvedImage,
    favicon,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Validate URL
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Return cached result if available
  const cached = cache.get(url)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch URL', title: '', description: '', image: null, favicon: null },
        { status: 200 }
      )
    }

    const html = await response.text()
    const preview = parseMetadata(html, response.url || url)

    // Cache the result (even partial data is fine)
    cache.set(url, preview)

    return NextResponse.json(preview)
  } catch (error) {
    // Return a graceful fallback with favicon from URL domain
    let favicon: string | null = null
    try {
      const urlObj = new URL(url)
      favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlObj.hostname)}&sz=32`
    } catch { /* ignore */ }

    const fallback: PreviewData = {
      title: '',
      description: '',
      image: null,
      favicon,
    }
    return NextResponse.json(fallback)
  }
}
