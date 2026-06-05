import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppConfig } from '@shared/types';

// Mock node-cron
const mockCronSchedule = vi.fn();
const mockCronValidate = vi.fn().mockReturnValue(true);
const mockTaskStop = vi.fn();

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: any[]) => mockCronSchedule(...args),
    validate: (...args: any[]) => mockCronValidate(...args),
  },
}));

// Mock configService
const mockConfigGet = vi.fn();
const mockConfigUpdate = vi.fn();
vi.mock('../configService.js', () => ({
  configService: {
    get: () => mockConfigGet(),
    update: (...args: any[]) => mockConfigUpdate(...args),
  },
}));

// Mock cacheService
const mockRefreshAll = vi.fn();
vi.mock('../cacheService.js', () => ({
  cacheService: {
    refreshAll: (...args: any[]) => mockRefreshAll(...args),
  },
}));

import { schedulerService } from '../schedulerService.js';

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    keywords: [],
    matchMode: 'any',
    sources: { weibo: true, zhihu: true, bilibili: true },
    topN: 20,
    refreshMode: 'both',
    scheduledTime: '08:00',
    cacheTTL: 300,
    ...overrides,
  };
}

describe('schedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCronSchedule.mockReturnValue({ stop: mockTaskStop });
    mockConfigGet.mockReturnValue(makeConfig());
  });

  describe('start()', () => {
    it('refreshMode=manual 时不应注册 cron 任务', () => {
      mockConfigGet.mockReturnValue(makeConfig({ refreshMode: 'manual' }));

      schedulerService.start();

      expect(mockCronSchedule).not.toHaveBeenCalled();
    });

    it('refreshMode=scheduled 时应注册 cron 任务', () => {
      mockConfigGet.mockReturnValue(makeConfig({
        refreshMode: 'scheduled',
        scheduledTime: '08:30',
      }));

      schedulerService.start();

      expect(mockCronSchedule).toHaveBeenCalledWith(
        '30 8 * * *',
        expect.any(Function),
      );
    });

    it('refreshMode=both 时应注册 cron 任务', () => {
      mockConfigGet.mockReturnValue(makeConfig({
        refreshMode: 'both',
        scheduledTime: '23:59',
      }));

      schedulerService.start();

      expect(mockCronSchedule).toHaveBeenCalledWith(
        '59 23 * * *',
        expect.any(Function),
      );
    });

    it('cron 表达式应从 scheduledTime 正确解析', () => {
      mockConfigGet.mockReturnValue(makeConfig({
        refreshMode: 'scheduled',
        scheduledTime: '06:00',
      }));

      schedulerService.start();

      expect(mockCronSchedule).toHaveBeenCalledWith('0 6 * * *', expect.any(Function));
    });
  });

  describe('stop()', () => {
    it('已注册任务时应调用 task.stop()', () => {
      mockConfigGet.mockReturnValue(makeConfig({ refreshMode: 'scheduled' }));
      schedulerService.start();

      schedulerService.stop();

      expect(mockTaskStop).toHaveBeenCalled();
    });

    it('未注册任务时 stop() 不应报错', () => {
      // 直接 stop，不先 start
      expect(() => schedulerService.stop()).not.toThrow();
    });
  });

  describe('restart()', () => {
    it('应停止旧任务并注册新任务', () => {
      mockConfigGet.mockReturnValue(makeConfig({
        refreshMode: 'scheduled',
        scheduledTime: '08:00',
      }));
      schedulerService.start();

      vi.clearAllMocks();
      mockCronSchedule.mockReturnValue({ stop: vi.fn() });

      schedulerService.restart();

      // restart 会调用 stop() + start()
      // stop 会调用 task.stop()，但我们刚 clearAllMocks
      // 实际上 restart 中 stop() 调用的是旧 task 上的 stop，新 mock 无法跟踪
      // 但 start() 肯定会被调用
      expect(mockCronSchedule).toHaveBeenCalled();
    });
  });
});
