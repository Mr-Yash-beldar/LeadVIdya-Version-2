export const CURRENT_APP_VERSION = '3.7.4';

/**
 * Compares two semantic version strings (e.g. "1.2.3" and "1.2.4").
 * Returns 1 if v1 > v2, -1 if v1 < v2, and 0 if they are equal.
 */

export const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
};
