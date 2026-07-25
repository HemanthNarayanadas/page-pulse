import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import { ConcurrencyQueue } from './queueService';
import { TimeoutError, FetchFailedError } from '../utils/errors';

export const fetchQueue = new ConcurrencyQueue(config.maxConcurrentFetches);

export interface RawFetchResult {
  response: AxiosResponse<string>;
  responseTimeMs: number;
}

/**
 * Performs the outbound HTTP GET for a target URL, subject to the
 * global concurrency limit and a hard timeout. Distinguishes timeout
 * failures from generic network failures so callers can return the
 * correct HTTP status code (408 vs 502).
 */
export async function fetchPage(url: string): Promise<RawFetchResult> {
  return fetchQueue.run(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);
    const start = Date.now();

    try {
      const response = await axios.get<string>(url, {
        signal: controller.signal,
        timeout: config.fetchTimeoutMs,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: () => true, // we want to inspect non-2xx too
        headers: {
          'User-Agent': 'PagePulse-Auditor/1.0 (+https://digitalheroesco.com)',
        },
      });
      return { response, responseTimeMs: Date.now() - start };
    } catch (err: unknown) {
      const isTimeout =
        axios.isCancel(err) ||
        (axios.isAxiosError(err) && (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED'));
      if (isTimeout) {
        throw new TimeoutError();
      }
      const message = axios.isAxiosError(err) ? err.message : 'Unknown fetch error';
      throw new FetchFailedError(`Failed to reach target URL: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  });
}

/**
 * HEAD request used to cheaply check whether an image resource resolves.
 * Falls back to "broken" on any error, timeout, or non-2xx status.
 */
export async function isImageBroken(imageUrl: string): Promise<boolean> {
  try {
    const res = await axios.head(imageUrl, {
      timeout: 3000,
      validateStatus: () => true,
      maxRedirects: 3,
    });
    return res.status < 200 || res.status >= 400;
  } catch {
    return true;
  }
}
