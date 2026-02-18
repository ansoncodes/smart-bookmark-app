/**
 * Normalizes a URL input string by trimming whitespace and prepending https:// if no protocol is present.
 * Respects existing http:// or https:// protocols.
 */
export function normalizeUrl(input: string): string {
    if (!input) return ''

    let trimmed = input.trim()

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

        // Hostname check: must contain at least one dot (e.g., "google.com")
        // and shouldn't be just a dot
        const host = url.hostname
        if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) {
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
