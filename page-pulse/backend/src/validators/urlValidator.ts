import net from 'net';
import { InvalidUrlError, PrivateAddressError } from '../utils/errors';

/**
 * Private / reserved IPv4 ranges we refuse to audit (SSRF protection).
 */
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
];

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIpv4InRange(ip: string, range: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

export function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IPV4_RANGES.some(([range, bits]) => isIpv4InRange(ip, range, bits));
}

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1', 'metadata.google.internal']);

/**
 * Validates a user-supplied URL for the audit endpoint.
 * Throws InvalidUrlError / PrivateAddressError on failure.
 */
export function validateAuditUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    throw new InvalidUrlError('URL is required and must be a non-empty string.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new InvalidUrlError('URL could not be parsed. Provide a fully-qualified URL, e.g. https://example.com');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new InvalidUrlError('Only http and https protocols are supported.');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new PrivateAddressError();
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new PrivateAddressError();
  }

  if (net.isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
    throw new PrivateAddressError();
  }

  if (net.isIP(hostname) === 6) {
    // Block loopback / unique-local / link-local IPv6
    if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) {
      throw new PrivateAddressError();
    }
  }

  return parsed;
}
