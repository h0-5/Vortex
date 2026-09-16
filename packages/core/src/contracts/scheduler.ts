export interface PluginScheduler {
  schedule(key: string, delayMs: number, task: () => Promise<void> | void): void;
  cancel(key: string): void;
  cancelAll(): void;
}
