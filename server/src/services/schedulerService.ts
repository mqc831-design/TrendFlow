import cron from 'node-cron';
import { configService } from './configService.js';
import { cacheService } from './cacheService.js';
import { Platform } from '@shared/types';

class SchedulerService {
  private task: cron.ScheduledTask | null = null;

  start(): void {
    const config = configService.get();

    if (config.refreshMode === 'manual') {
      console.log('[Scheduler] refreshMode=manual，跳过定时任务注册');
      return;
    }

    const [hour, minute] = config.scheduledTime.split(':').map(Number);
    const expression = `${minute} ${hour} * * *`;

    console.log(`[Scheduler] 注册定时刷新任务: ${expression} (每天 ${config.scheduledTime})`);

    this.task = cron.schedule(expression, async () => {
      console.log(`[Scheduler] 定时刷新触发 @ ${new Date().toISOString()}`);
      try {
        const currentConfig = configService.get();
        const enabled = (Object.keys(currentConfig.sources) as Platform[])
          .filter((k) => currentConfig.sources[k]);
        await cacheService.refreshAll(enabled);
        console.log(`[Scheduler] 定时刷新完成，平台: ${enabled.join(', ')}`);
      } catch (err) {
        console.error('[Scheduler] 定时刷新失败:', err);
      }
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      console.log('[Scheduler] 定时任务已停止');
    }
  }

  restart(): void {
    this.stop();
    this.start();
  }
}

export const schedulerService = new SchedulerService();
