/**
 * Validates if a URL is reachable.
 * Returns false for clearly broken links while avoiding common false positives
 * from anti-bot protections.
 */
export async function validateUrl(url: string): Promise<boolean> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
        // Basic format check
        new URL(url)

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }

        let response = await fetch(url, {
            method: 'HEAD',
            headers,
            signal: controller.signal,
            cache: 'no-cache',
        })

        // Some sites reject HEAD; retry with GET.
        if (response.status === 405 || response.status === 501) {
            response = await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal,
                cache: 'no-cache',
            })
        }

        // Definitely broken resources.
        if (response.status === 404 || response.status === 410) {
            return false
        }

        // Server-side failures are generally broken for the user at check time.
        if (response.status >= 500) {
            return false
        }

        // Bot-protection/auth/rate-limit responses are reachable but blocked.
        if (response.status === 401 || response.status === 403 || response.status === 429) {
            return true
        }

        return true
    } catch (error) {
        console.error(`[validateUrl] Error checking ${url}:`, error)
        const errObj = error as {
            message?: string
            cause?: { code?: string; errno?: number; syscall?: string; message?: string }
        }
        const message = (errObj?.message || String(error)).toLowerCase()
        const causeMessage = (errObj?.cause?.message || '').toLowerCase()
        const causeCode = (errObj?.cause?.code || '').toLowerCase()
        const syscall = (errObj?.cause?.syscall || '').toLowerCase()
        const combined = `${message} ${causeMessage} ${causeCode} ${syscall}`

        // Timeout is ambiguous; avoid false broken flags for slow sites.
        if (combined.includes('aborted') || combined.includes('timeout')) {
            return true
        }

        // DNS/network/TLS failures are usually truly unreachable.
        if (
            causeCode === 'enotfound' ||
            causeCode === 'econnrefused' ||
            causeCode === 'eai_again' ||
            causeCode === 'und_err_connect_timeout' ||
            causeCode === 'und_err_socket' ||
            combined.includes('enotfound') ||
            combined.includes('econnrefused') ||
            combined.includes('eai_again') ||
            combined.includes('getaddrinfo') ||
            combined.includes('network') ||
            syscall === 'getaddrinfo'
        ) {
            return false
        }

        // Invalid URL format is definitely bad.
        if (combined.includes('invalid url')) {
            return false
        }

        // Cert chain issues from runtime/network path can be environment-specific.
        // Avoid false positives for otherwise valid sites.
        if (combined.includes('certificate') || combined.includes('issuer cert')) {
            return true
        }

        // Default to reachable to avoid over-flagging.
        return true
    } finally {
        clearTimeout(timeoutId)
    }
}
