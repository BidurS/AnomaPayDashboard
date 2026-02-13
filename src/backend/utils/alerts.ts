/**
 * Discord Alert Utility
 * Sends structured alerts to a Discord webhook for observability.
 */

type Severity = 'info' | 'warning' | 'critical';

const SEVERITY_COLORS: Record<Severity, number> = {
    info: 0x3498db,     // Blue
    warning: 0xf39c12,  // Orange
    critical: 0xe74c3c, // Red
};

const SEVERITY_EMOJI: Record<Severity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
};

export async function sendDiscordAlert(
    webhookUrl: string | undefined,
    title: string,
    message: string,
    severity: Severity = 'warning'
): Promise<void> {
    if (!webhookUrl) return; // Silently skip if no webhook configured

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `${SEVERITY_EMOJI[severity]} ${title}`,
                    description: message,
                    color: SEVERITY_COLORS[severity],
                    timestamp: new Date().toISOString(),
                    footer: { text: 'Gnoma Explorer • Indexer Monitor' },
                }],
            }),
        });
    } catch {
        // Best-effort: don't let alert failures crash the worker
        console.error('[Alert] Failed to send Discord notification');
    }
}

/**
 * Check indexer health and send alert if lagging.
 * Returns true if alert was sent.
 */
export async function checkAndAlertHealth(
    webhookUrl: string | undefined,
    lastSyncedBlock: number,
    currentBlock: number,
    chainName: string = 'Base'
): Promise<boolean> {
    const diff = currentBlock - lastSyncedBlock;

    if (diff > 50) {
        await sendDiscordAlert(
            webhookUrl,
            'Indexer Lagging',
            `**Chain**: ${chainName}\n**Last Synced**: Block ${lastSyncedBlock.toLocaleString()}\n**Chain Tip**: Block ${currentBlock.toLocaleString()}\n**Lag**: ${diff.toLocaleString()} blocks`,
            diff > 500 ? 'critical' : 'warning'
        );
        return true;
    }
    return false;
}
