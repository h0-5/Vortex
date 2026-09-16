import { describe, expect, it, vi } from 'vitest';

import { ScopedPluginScheduler } from './scheduler.js';
import { createLogger } from './test-helpers.js';

describe('ScopedPluginScheduler', () => {
  it('executes a scheduled task after the delay', async () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);
    const task = vi.fn();

    scheduler.schedule('cleanup', 50, task);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(task).toHaveBeenCalledOnce();
    scheduler.cancelAll();
  });

  it('cancels a pending task', async () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);
    const task = vi.fn();

    scheduler.schedule('cleanup', 100, task);
    scheduler.cancel('cleanup');
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(task).not.toHaveBeenCalled();
    scheduler.cancelAll();
  });

  it('cancels all pending tasks', async () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);
    const first = vi.fn();
    const second = vi.fn();

    scheduler.schedule('first', 80, first);
    scheduler.schedule('second', 80, second);
    scheduler.cancelAll();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('replaces an existing timer when scheduling the same key', async () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);
    const first = vi.fn();
    const second = vi.fn();

    scheduler.schedule('replace', 200, first);
    scheduler.schedule('replace', 50, second);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    scheduler.cancelAll();
  });

  it('logs errors from failing tasks without throwing', async () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);

    scheduler.schedule('failing', 20, () => {
      throw new Error('task failure');
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(logger.error).toHaveBeenCalledWith(
      'Scheduled plugin task failed.',
      expect.objectContaining({ key: 'failing' }),
    );
    scheduler.cancelAll();
  });

  it('rejects invalid scheduler inputs', () => {
    const logger = createLogger();
    const scheduler = new ScopedPluginScheduler(logger);

    expect(() => scheduler.schedule('', 100, vi.fn())).toThrow();
    expect(() => scheduler.schedule('ok', -1, vi.fn())).toThrow();
  });
});
