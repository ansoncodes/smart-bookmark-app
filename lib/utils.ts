export async function verifyPopupPermissions(): Promise<boolean> {
    // Test by opening two dummy windows.
    // If only one (or zero) opens, we know "Always Allow" is not granted.
    // If both open, we know we have permission to open multiple tabs.

    const width = 100
    const height = 100
    const left = window.screen.width - width
    const top = window.screen.height - height
    const features = `width=${width},height=${height},left=${left},top=${top}`

    const d1 = window.open('about:blank', '_blank', features)
    const d2 = window.open('about:blank', '_blank', features)

    const success = !!(d1 && d2)

    // Cleanup immediately
    if (d1) d1.close()
    if (d2) d2.close()

    return success
}

export function openLinksInNewTabs(urls: string[]) {
    const validUrls = urls.filter((url) => {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    })

    // Since we verified permission beforehand, we can just open them.
    // We stagger slightly to be nice to the browser, but we rely on the verified "Always Allow" state.
    validUrls.forEach((url, i) => {
        setTimeout(() => {
            window.open(url, '_blank', 'noopener,noreferrer')
        }, i * 100)
    })
}
