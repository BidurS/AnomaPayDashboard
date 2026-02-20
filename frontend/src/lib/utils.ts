import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// API base URL
export const API_URL = 'https://anomapay-explorer.bidurandblog.workers.dev'

// Format large numbers
export function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return '0'
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(2)}M`
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`
    }
    return num.toLocaleString()
}

// Format currency
export function formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num)
}

// Format Wei to ETH (or Unit)
export function formatWei(wei: string | number, decimals = 4): string {
    if (!wei) return '0'
    const val = BigInt(wei)
    if (val === 0n) return '0'
    
    // Simple formatting for display (assuming 18 decimals)
    const divisor = 10n ** 18n
    const whole = val / divisor
    const remainder = val % divisor
    
    // If very small
    if (whole === 0n && remainder < 10n ** 14n) return '< 0.0001'

    let fraction = remainder.toString().padStart(18, '0').slice(0, decimals)
    // Trim trailing zeros
    fraction = fraction.replace(/0+$/, '')
    
    return fraction ? `${whole}.${fraction}` : `${whole}`
}

// Truncate address/hash
export function truncateHash(hash: string, startChars = 6, endChars = 4): string {
    if (hash.length <= startChars + endChars) return hash
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`
}

// Shorten address (alias with different defaults)
export function shortenAddress(address: string, startChars = 6, endChars = 4): string {
    if (!address) return ''
    if (address.length <= startChars + endChars) return address
    return `${address.slice(0, startChars)}....${address.slice(-endChars)}`
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

// Time ago formatter
export function timeAgo(timestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}
