/**
 * Safely converts a string to an array of Unicode code points.
 * This avoids splitting surrogate pairs (e.g., emoji).
 */
const toCodePoints = (str: string) => Array.from(str ?? '');

/**
 * Truncate a string to a maximum number of visible characters.
 *
 * @param text - The original string.
 * @param limit - Max number of characters to keep (by code point).
 * @param opts.suffix - Suffix to append when truncated. Defaults to an ellipsis "…".
 *                      Pass an empty string ("") to omit.
 *
 * @example
 * truncate("hello world", 5) -> "hello…"
 * truncate("⚡️Electric", 3) -> "⚡️E…"
 * truncate("hello", 10) -> "hello"
 */
export function truncate(text: string, limit: number, opts?: { suffix?: string }): string {
    const suffix = opts?.suffix ?? '…';
    if (typeof text !== 'string') return '';
    if (!Number.isFinite(limit) || limit <= 0) return suffix ? suffix : '';

    const cp = toCodePoints(text);
    if (cp.length <= limit) return text;

    const trimmed = cp.slice(0, limit).join('');
    return suffix ? trimmed + suffix : trimmed;
}

/**
 * Convert large integers to compact strings like 13K, 2.5M, etc.
 *
 * Defaults to 0 decimals and standard rounding, matching "13245 -> 13K".
 *
 * @param n - The number to format.
 * @param opts.precision - Decimal places to keep (default 0).
 * @param opts.rounding - 'round' | 'floor' | 'ceil' (default 'round').
 *
 * @example
 * prettyCount(13245) -> "13K"
 * prettyCount(15250, { precision: 1 }) -> "15.3K"
 * prettyCount(999) -> "999"
 * prettyCount(1_235_000) -> "1.2M"
 */
export function prettyCount(
    n: number | string,
    opts?: { precision?: number; rounding?: 'round' | 'floor' | 'ceil' },
): string {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    
    if (!Number.isFinite(num) || isNaN(num)) return '0';
    
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    const precision = opts?.precision ?? 0;
    const rounder = Math[opts?.rounding ?? 'round'];

    const units = ['', 'K', 'M', 'B', 'T'];
    let unitIndex = 0;
    let value = abs;

    while (value >= 1000 && unitIndex < units.length - 1) {
        value /= 1000;
        unitIndex++;
    }

    const factor = Math.pow(10, precision);
    const rounded = rounder(value * factor) / factor;

    // Avoid showing 1000 with a lower unit (e.g., 1000K => 1M)
    if (rounded >= 1000 && unitIndex < units.length - 1) {
        unitIndex += 1;
        value = 1;
    }

    const out = (rounded >= 1000 ? 1 : rounded).toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    });

    return `${sign}${out}${units[unitIndex]}`;
}

/**
 * Returns a short, social-style relative time like "now", "45s", "5m", "2h", "3d", "4w", "6mo", "1y".
 *
 * @param input - Date | number | string (anything new Date(...) accepts)
 * @param now - Current time (optional, mainly for testing)
 */
export function timeAgo(input: Date | number | string, now?: Date | number): string {
    const d = new Date(input);
    const ref = now ? new Date(now) : new Date();

    const diffMs = ref.getTime() - d.getTime();
    const s = Math.max(0, Math.floor(diffMs / 1000));

    if (s < 5) return 'now';
    if (s < 60) return `${s}s`;

    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;

    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;

    const dys = Math.floor(h / 24);
    if (dys < 7) return `${dys}d`;

    const w = Math.floor(dys / 7);
    if (w < 5) return `${w}w`;

    const mo = Math.floor(dys / 30);
    if (mo < 12) return `${mo}mo`;

    const y = Math.floor(dys / 365);
    return `${y}y`;
}

/**
 * Format a date using Intl.DateTimeFormat with sensible defaults.
 * Works in modern React Native with Hermes.
 *
 * @example
 * formatDate(new Date(), { dateStyle: 'medium', timeStyle: 'short' })
 */
export function formatDate(
    input: Date | number | string,
    opts?: Intl.DateTimeFormatOptions & { locale?: string },
): string {
    const { locale, ...fmt } = opts ?? {};
    const d = new Date(input);

    // Default to a concise date; caller can pass timeStyle/dateStyle etc.
    const options: Intl.DateTimeFormatOptions = Object.keys(fmt).length
        ? fmt
        : { year: 'numeric', month: 'short', day: 'numeric' };

    try {
        return new Intl.DateTimeFormat(locale, options).format(d);
    } catch {
        // Fallback if Intl is missing or options unsupported
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate(),
        ).padStart(2, '0')}`;
    }
}

/** Returns true if two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date | number | string, b: Date | number | string): boolean {
    const d1 = new Date(a);
    const d2 = new Date(b);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

/** Start of the local day (00:00:00.000) */
export function startOfDay(input: Date | number | string): Date {
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** End of the local day (23:59:59.999) */
export function endOfDay(input: Date | number | string): Date {
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** YYYY-MM-DD (local date) */
export function toISODate(input: Date | number | string): string {
    const d = new Date(input);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default {
    truncate,
    prettyCount,
    timeAgo,
    formatDate,
    isSameDay,
    startOfDay,
    endOfDay,
    toISODate,
};
