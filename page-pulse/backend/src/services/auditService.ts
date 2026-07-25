import * as cheerio from 'cheerio';
import { fetchPage, isImageBroken } from './fetchService';
import { cacheService, buildCacheKey } from '../cache/cacheService';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AuditResult, SecurityHeaders } from '../types';

const MAX_BROKEN_IMAGE_CHECKS = 15; // cap outbound HEAD checks per audit to keep latency bounded

function extractSecurityHeaders(headers: Record<string, unknown>): SecurityHeaders {
  const get = (name: string): string | null => {
    const value = headers[name.toLowerCase()];
    return typeof value === 'string' ? value : null;
  };

  return {
    strictTransportSecurity: get('strict-transport-security'),
    contentSecurityPolicy: get('content-security-policy'),
    xFrameOptions: get('x-frame-options'),
    xContentTypeOptions: get('x-content-type-options'),
    referrerPolicy: get('referrer-policy'),
    permissionsPolicy: get('permissions-policy'),
  };
}

function countWords(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length === 0 ? 0 : trimmed.split(' ').length;
}

async function countBrokenImages(imageSrcs: string[], baseUrl: string): Promise<number> {
  const resolved = imageSrcs
    .map((src) => {
      try {
        return new URL(src, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((v): v is string => v !== null)
    .slice(0, MAX_BROKEN_IMAGE_CHECKS);

  if (resolved.length === 0) return 0;

  const results = await Promise.all(resolved.map((src) => isImageBroken(src)));
  return results.filter(Boolean).length;
}

/**
 * Runs a full audit of `targetUrl`. Returns cached result (with
 * `cached: true` signalled by caller) when available and fresh.
 */
export async function runAudit(targetUrl: string): Promise<{ result: AuditResult; cached: boolean }> {
  const cacheKey = buildCacheKey(targetUrl);
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    try {
      return { result: JSON.parse(cached) as AuditResult, cached: true };
    } catch (err) {
      logger.warn({ err }, 'Failed to parse cached audit result; refetching');
    }
  }

  const { response, responseTimeMs } = await fetchPage(targetUrl);
  const html = typeof response.data === 'string' ? response.data : '';
  const $ = cheerio.load(html);

  const parsedUrl = new URL(targetUrl);
  const title = $('title').first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    null;

  const bodyText = $('body').text();
  const wordCount = countWords(bodyText);

  const imageSrcs = $('img')
    .map((_, el) => $(el).attr('src'))
    .get()
    .filter((src): src is string => Boolean(src));
  const totalImages = imageSrcs.length;

  let internalLinks = 0;
  let externalLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const resolved = new URL(href, targetUrl);
      if (resolved.hostname === parsedUrl.hostname) internalLinks += 1;
      else externalLinks += 1;
    } catch {
      // ignore malformed hrefs
    }
  });

  const brokenImages = await countBrokenImages(imageSrcs, targetUrl);

  const contentType = (response.headers['content-type'] as string | undefined) ?? null;
  const pageSizeBytes = Buffer.byteLength(html, 'utf8');

  const result: AuditResult = {
    url: targetUrl,
    statusCode: response.status,
    responseTimeMs,
    httpsEnabled: parsedUrl.protocol === 'https:',
    title,
    metaDescription,
    wordCount,
    totalImages,
    brokenImages,
    internalLinks,
    externalLinks,
    pageSizeBytes,
    contentType,
    securityHeaders: extractSecurityHeaders(response.headers as Record<string, unknown>),
    auditedAt: new Date().toISOString(),
  };

  await cacheService.set(cacheKey, JSON.stringify(result), config.cacheTtlSeconds);

  return { result, cached: false };
}
