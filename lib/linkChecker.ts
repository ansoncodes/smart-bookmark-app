/**
 * Validates if a URL is reachable.
 * Returns false only for clearly broken links (e.g. 404/410).
 * Many real sites block bots/HEAD requests, so we treat ambiguous/network
 * failures as valid to avoid false broken-link flags.
 */
export async function validateUrl(url: string): Promise<boolean> {
    try {
        // Basic format check
        new URL(url)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

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

        clearTimeout(timeoutId)

        // Mark as broken only for explicit "not found / gone" responses.
        if (response.status === 404 || response.status === 410) {
            return false
        }

        // Everything else is treated as reachable/ambiguous to avoid false positives.
        return true
    } catch (error) {
        console.error(`[validateUrl] Error checking ${url}:`, error)
        // Network/bot-protection errors are ambiguous, not definitively broken.
        return true
    }
}
