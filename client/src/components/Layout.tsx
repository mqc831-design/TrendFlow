import { Outlet } from 'react-router-dom';
import { useConfigContext } from '../context/ConfigContext';
import styles from './Layout.module.css';

function Layout() {
  const { config } = useConfigContext();
  const cacheMinutes = Math.floor(config.cacheTTL / 60);

  return (
    <div className={styles['app-layout']}>
      <header className={styles['app-header']}>
        <h1>迷你今日热榜</h1>
        <p className={styles['app-subtitle']}>聚合微博、知乎、B站今日热榜</p>
      </header>
      <main className={styles['app-main']}>
        <Outlet />
      </main>
      <footer className={styles['app-footer']}>
        <p>本站为个人学习项目，非商业用途</p>
        <p>数据来源：微博、知乎、B站公开热榜接口，非官方数据</p>
        <p>更新频率约 {cacheMinutes} 分钟（缓存 TTL）</p>
        <p>如有侵权或违规内容，请联系：contact@example.com</p>
      </footer>
    </div>
  );
}

export default Layout;
