/**
 * Validates if a URL is reachable.
 * Returns true if the URL returns a status code < 400.
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

        const response = await fetch(url, {
            method: 'HEAD',
            headers,
            signal: controller.signal,
            cache: 'no-cache',
        }).catch(async (err) => {
            // Fallback to GET if HEAD is not supported by the server
            if (err.name === 'AbortError') throw err
            return await fetch(url, {
                method: 'GET',
                headers,
                signal: controller.signal,
                cache: 'no-cache',
            })
        })

        clearTimeout(timeoutId)

        // 403 (Forbidden) and 429 (Too Many Requests) often indicate bot protection
        // for sites that are otherwise functional. We treat them as valid to avoid false positives.
        return response.status < 400 || response.status === 403 || response.status === 429
    } catch (error) {
        console.error(`[validateUrl] Error checking ${url}:`, error)
        return false
    }
}
