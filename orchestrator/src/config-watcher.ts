import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export interface ConfigWatcherOptions {
  configDir: string;
  debounceMs?: number;
  onAgentsChange?: () => Promise<void>;
  onModelsChange?: () => Promise<void>;
}

export class ConfigWatcher {
  private configDir: string;
  private debounceMs: number;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private onAgentsChange?: () => Promise<void>;
  private onModelsChange?: () => Promise<void>;
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(options: ConfigWatcherOptions) {
    this.configDir = options.configDir;
    this.debounceMs = options.debounceMs || 1000;
    this.onAgentsChange = options.onAgentsChange;
    this.onModelsChange = options.onModelsChange;
  }

  start(): void {
    logger.info({ configDir: this.configDir }, 'Starting config watcher');

    // Watch agents.yaml
    this.watchFile('agents.yaml', async () => {
      logger.info('agents.yaml changed, reloading...');
      if (this.onAgentsChange) {
        try {
          await this.onAgentsChange();
          logger.info('Agents reloaded successfully');
        } catch (error) {
          logger.error({ error }, 'Failed to reload agents');
        }
      }
    });

    // Watch models.yaml
    this.watchFile('models.yaml', async () => {
      logger.info('models.yaml changed, reloading...');
      if (this.onModelsChange) {
        try {
          await this.onModelsChange();
          logger.info('Models reloaded successfully');
        } catch (error) {
          logger.error({ error }, 'Failed to reload models');
        }
      }
    });
  }

  private watchFile(filename: string, callback: () => Promise<void>): void {
    const filepath = path.join(this.configDir, filename);

    if (!fs.existsSync(filepath)) {
      logger.warn({ filepath }, 'Config file does not exist, skipping watch');
      return;
    }

    const watcher = fs.watch(filepath, (eventType, changedFilename) => {
      if (eventType === 'change') {
        // Clear existing debounce timer
        if (this.debounceTimers.has(filename)) {
          clearTimeout(this.debounceTimers.get(filename)!);
        }

        // Set new debounce timer
        const timer = setTimeout(async () => {
          await callback();
          this.debounceTimers.delete(filename);
        }, this.debounceMs);

        this.debounceTimers.set(filename, timer);
      }
    });

    watcher.on('error', (error) => {
      logger.error({ error, filepath }, 'Config watcher error');
    });

    this.watchers.set(filename, watcher);
  }

  stop(): void {
    logger.info('Stopping config watcher');

    // Clear timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}
