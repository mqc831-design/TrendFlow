import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppConfig, AppConfigPartial } from '@shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../../config.json');

const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

class ConfigService {
  private memoryCache: AppConfig | null = null;

  private loadFromFile(): AppConfig {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        this.writeToFile(DEFAULT_CONFIG);
        return { ...DEFAULT_CONFIG };
      }
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      console.warn('[ConfigService] 配置文件读取失败，使用默认配置');
      return { ...DEFAULT_CONFIG };
    }
  }

  private writeToFile(config: AppConfig): void {
    try {
      const dir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigService] 配置文件写入失败:', err);
      throw err;
    }
  }

  get(): AppConfig {
    if (!this.memoryCache) {
      this.memoryCache = this.loadFromFile();
    }
    return { ...this.memoryCache };
  }

  update(partial: AppConfigPartial): AppConfig {
    const current = this.get();
    const merged: AppConfig = { ...current, ...partial };
    this.writeToFile(merged);
    this.memoryCache = merged;
    return { ...merged };
  }

  reset(): AppConfig {
    this.writeToFile(DEFAULT_CONFIG);
    this.memoryCache = { ...DEFAULT_CONFIG };
    return this.get();
  }
}

export const configService = new ConfigService();
