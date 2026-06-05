import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppConfig } from '@shared/types';

// 必须在所有 import 之前 mock node:fs
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock('node:fs', () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  },
}));

import { configService } from '../configService.js';

const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

describe('configService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 每个测试前重置内存缓存，迫使重新读取文件
    (configService as any).memoryCache = null;
    // 默认：配置文件不存在
    mockExistsSync.mockReturnValue(false);
    mockWriteFileSync.mockImplementation(() => {});
    mockMkdirSync.mockImplementation(() => {});
  });

  describe('get()', () => {
    it('配置文件不存在时应返回默认配置并创建文件', () => {
      mockExistsSync.mockReturnValue(false);

      const config = configService.get();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        'utf-8',
      );
    });

    it('配置文件存在时应读取并合并默认配置', () => {
      mockExistsSync.mockReturnValue(true);
      const fileContent = { keywords: ['测试'], cacheTTL: 600 };
      mockReadFileSync.mockReturnValue(JSON.stringify(fileContent));

      const config = configService.get();

      expect(config.keywords).toEqual(['测试']);
      expect(config.cacheTTL).toBe(600);
      // 未在文件中的字段沿用默认值
      expect(config.topN).toBe(20);
      expect(config.matchMode).toBe('any');
    });

    it('JSON 文件损坏时应返回默认配置并打印警告', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json {{{');

      const config = configService.get();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(warnSpy).toHaveBeenCalledWith(
        '[ConfigService] 配置文件读取失败，使用默认配置',
      );
      warnSpy.mockRestore();
    });

    it('多次 get() 应返回不同副本（修改返回值不影响缓存）', () => {
      mockExistsSync.mockReturnValue(false);

      const config1 = configService.get();
      const config2 = configService.get();

      expect(config1).not.toBe(config2); // 不同引用
      expect(config1).toEqual(config2);  // 值相同

      config1.keywords = ['modified'];
      expect(config2.keywords).toEqual([]); // config2 不受影响
    });

    it('memoryCache 存在时应直接返回缓存副本，不读文件', () => {
      // 先 get 一次建立缓存
      mockExistsSync.mockReturnValue(false);
      configService.get();
      const readCount = mockReadFileSync.mock.calls.length;

      // 第二次 get 不应再读文件
      configService.get();
      expect(mockReadFileSync).toHaveBeenCalledTimes(readCount); // readCount 不变
      // existsSync 和 writeFileSync 也不应再次调用（但 update 可能调用 write）
      // 重点是 readFileSync 调用次数不变
    });
  });

  describe('update()', () => {
    it('应正确部分合并配置', () => {
      mockExistsSync.mockReturnValue(false);
      const result = configService.update({ keywords: ['热搜'], topN: 10 });

      expect(result.keywords).toEqual(['热搜']);
      expect(result.topN).toBe(10);
      expect(result.cacheTTL).toBe(600); // 未修改的字段保持默认值
    });

    it('update 后 get() 应反映新值', () => {
      mockExistsSync.mockReturnValue(false);
      configService.update({ cacheTTL: 999 });

      const config = configService.get();

      expect(config.cacheTTL).toBe(999);
      expect(config.keywords).toEqual([]);
    });

    it('update 应写入文件', () => {
      mockExistsSync.mockReturnValue(false);
      configService.update({ scheduledTime: '12:00' });

      const writeCalls = mockWriteFileSync.mock.calls;
      // 至少有一次写入包含 scheduledTime: '12:00'
      // writeFileSync 的参数: (path, content, encoding)，content 在 index 1
      const lastCall = writeCalls[writeCalls.length - 1];
      const writtenJson = lastCall[1] as string;
      expect(writtenJson).toContain('"scheduledTime"');
      expect(writtenJson).toContain('12:00');
    });

    it('多次 update 应累积生效', () => {
      mockExistsSync.mockReturnValue(false);
      configService.update({ cacheTTL: 100 });
      configService.update({ topN: 30 });

      const config = configService.get();
      expect(config.cacheTTL).toBe(100);
      expect(config.topN).toBe(30);
    });
  });

  describe('reset()', () => {
    it('应恢复为默认配置', () => {
      mockExistsSync.mockReturnValue(false);
      configService.update({ keywords: ['改过'], cacheTTL: 50 });

      const resetConfig = configService.reset();

      expect(resetConfig).toEqual(DEFAULT_CONFIG);
      expect(resetConfig.keywords).toEqual([]);
      expect(resetConfig.cacheTTL).toBe(600);

      // 后续 get 也应为默认值
      const getConfig = configService.get();
      expect(getConfig).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('配置字段完整性', () => {
    it('返回的配置应包含所有必需字段', () => {
      mockExistsSync.mockReturnValue(false);
      const config = configService.get();

      expect(config).toHaveProperty('keywords');
      expect(config).toHaveProperty('matchMode');
      expect(config).toHaveProperty('sources');
      expect(config).toHaveProperty('topN');
      expect(config).toHaveProperty('refreshMode');
      expect(config).toHaveProperty('scheduledTime');
      expect(config).toHaveProperty('cacheTTL');
    });
  });
});
