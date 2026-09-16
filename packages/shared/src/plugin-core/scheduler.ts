import type { PluginLogger, PluginScheduler } from '../plugin-contracts.js';

export class ScopedPluginScheduler implements PluginScheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly logger: PluginLogger) {}

  schedule(key: string, delayMs: number, task: () => Promise<void> | void): void {
    if (!key || delayMs < 0 || !Number.isFinite(delayMs)) {
      throw new Error('Scheduler key and delay are invalid.');
    }
    this.cancel(key);
    const timer = setTimeout(() => {
      this.timers.delete(key);
      void (async () => {
        try {
          await task();
        } catch (error: unknown) {
          void this.logger.error('Scheduled plugin task failed.', {
            key,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }, delayMs);
    timer.unref?.();
    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
