import { useState } from 'react';
import { useConfigContext } from '../context/ConfigContext';
import { KeywordManager } from './KeywordManager';
import type { AppConfig } from '@shared/types';
import styles from './ConfigForm.module.css';

function ConfigForm() {
  const { config, updateConfig, loading } = useConfigContext();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (partial: Partial<AppConfig>) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateConfig(partial);
      setMessage('配置已保存');
    } catch {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles['config-form']} onSubmit={(e) => e.preventDefault()}>
      <h2>配置</h2>

      <KeywordManager
        keywords={config.keywords}
        onChange={(keywords) => handleSave({ keywords })}
      />

      <fieldset className={styles['config-fieldset']}>
        <legend>匹配模式</legend>
        <select
          value={config.matchMode}
          onChange={(e) => handleSave({ matchMode: e.target.value as AppConfig['matchMode'] })}
        >
          <option value="any">任一命中</option>
          <option value="all">全部命中</option>
          <option value="exclude">排除关键字</option>
        </select>
      </fieldset>

      <fieldset className={styles['config-fieldset']}>
        <legend>数据源</legend>
        {(['weibo', 'zhihu', 'bilibili'] as const).map((src) => (
          <label key={src} className={styles['checkbox-label']}>
            <input
              type="checkbox"
              checked={config.sources[src]}
              onChange={(e) =>
                handleSave({ sources: { ...config.sources, [src]: e.target.checked } })
              }
            />
            {{ weibo: '微博', zhihu: '知乎', bilibili: 'B站' }[src]}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles['config-fieldset']}>
        <legend>展示数量</legend>
        <select
          value={config.topN}
          onChange={(e) => handleSave({ topN: Number(e.target.value) as 10 | 20 | 30 })}
        >
          <option value={10}>10 条/平台</option>
          <option value={20}>20 条/平台</option>
          <option value={30}>30 条/平台</option>
        </select>
      </fieldset>

      <fieldset className={styles['config-fieldset']}>
        <legend>刷新策略</legend>
        <select
          value={config.refreshMode}
          onChange={(e) => handleSave({ refreshMode: e.target.value as AppConfig['refreshMode'] })}
        >
          <option value="manual">仅手动刷新</option>
          <option value="scheduled">仅定时刷新</option>
          <option value="both">手动 + 定时</option>
        </select>
      </fieldset>

      {message && <p className={styles['config-form__message']}>{message}</p>}
      {loading && <p>加载配置中...</p>}
    </form>
  );
}

export { ConfigForm };
