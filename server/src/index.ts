import { app } from './app.js';
import { env } from './config.js';
import { schedulerService } from './services/schedulerService.js';

app.listen(env.PORT, () => {
  console.log(`[Server] 迷你今日热榜后端已启动: http://localhost:${env.PORT}`);
  console.log(`[Server] 环境: ${env.NODE_ENV}`);
  schedulerService.start();
});
