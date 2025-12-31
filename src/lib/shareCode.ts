// src/lib/shareCode.ts
import { nanoid } from 'nanoid';

/**
 * Generates a unique share code for affiliate links.
 * Uses nanoid with a custom alphabet (URL-safe, no confusing characters).
 * 
 * @param length - Length of the share code (default: 8)
 * @returns A unique share code string (e.g., "abc12xyz")
 */
export function generateShareCode(length: number = 8): string {
  // Use nanoid with default alphabet (A-Za-z0-9_-)
  // 8 characters = 64^8 = ~281 trillion combinations
  return nanoid(length);
}

/**
 * Validates a share code format.
 * Share codes are alphanumeric with underscores and hyphens.
 * 
 * @param code - The share code to validate
 * @returns true if valid, false otherwise
 */
export function isValidShareCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  // Must be 6-12 characters, alphanumeric with _ and -
  return /^[A-Za-z0-9_-]{6,12}$/.test(code);
}

/**
 * Constructs the full share URL from a share code.
 * 
 * @param shareCode - The share code
 * @returns Full URL (e.g., "https://winbig.fun/challenge/abc12xyz")
 */
export function getShareUrl(shareCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.winbig.fun';
  return `${baseUrl}/challenge/${shareCode}`;
}
