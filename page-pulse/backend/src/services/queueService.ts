/**
 * Simple counting semaphore used to cap the number of concurrent
 * outbound fetches performed by the audit service. Prevents the
 * process from opening unbounded outbound connections under load.
 */
export class ConcurrencyQueue {
  private active = 0;
  private readonly maxConcurrent: number;
  private waiters: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  get activeCount(): number {
    return this.active;
  }

  get queueLength(): number {
    return this.waiters.length;
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}
