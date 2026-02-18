/**
 * Normalizes a URL input string by trimming whitespace and prepending https:// if no protocol is present.
 * Respects existing http:// or https:// protocols.
 */
export function normalizeUrl(input: string): string {
    if (!input) return ''

    const trimmed = input.trim()

    // If it already has a protocol, return as is
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed
    }

    // Handle cases where user might have typed //example.com
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`
    }

    // Default to https://
    return `https://${trimmed}`
}

/**
 * Validates a URL string after normalizing it.
 * Ensures it has a valid protocol and a hostname with at least one dot.
 */
export function isValidUrl(input: string): boolean {
    if (!input || input.trim() === '') return false

    const normalized = normalizeUrl(input)

    try {
        const url = new URL(normalized)

        // Basic protocol check (we only want http/https for bookmarks)
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false
        }

        // Hostname check:
        // Allow normal domains (must include a dot), localhost, and local IP/IPv6 hosts.
        const host = url.hostname
        const isLocalhost = host === 'localhost'
        const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
        const isIPv6 = host.includes(':')
        const isDomain = host.includes('.') && !host.startsWith('.') && !host.endsWith('.')

        if (!isDomain && !isLocalhost && !isIPv4 && !isIPv6) {
            return false
        }

        // Ensure it doesn't look like an incomplete protocol string
        if (normalized === 'http://' || normalized === 'https://') {
            return false
        }

        return true
    } catch {
        return false
    }
}
