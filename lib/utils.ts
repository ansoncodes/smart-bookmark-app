export function openLinksInNewTabs(urls: string[]) {
    const validUrls = urls.filter((url) => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    })

    if (validUrls.length === 0) return

    validUrls.forEach((url, index) => {
        setTimeout(() => {
            window.open(url, '_blank', 'noopener,noreferrer')
        }, index * 200) // Delay to prevent popup blocking
    })
}
