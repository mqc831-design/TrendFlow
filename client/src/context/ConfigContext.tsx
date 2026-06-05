import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppConfig, AppConfigPartial } from '@shared/types';
import { fetchConfig, updateConfig as apiUpdateConfig } from '../api/client';

const DEFAULT_CONFIG: AppConfig = {
  keywords: [],
  matchMode: 'any',
  sources: { weibo: true, zhihu: true, bilibili: true },
  topN: 20,
  refreshMode: 'both',
  scheduledTime: '08:00',
  cacheTTL: 600,
};

interface ConfigContextValue {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  updateConfig: (partial: AppConfigPartial) => Promise<void>;
  reload: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: AppConfig }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'UPDATE_SUCCESS'; payload: AppConfig }
  | { type: 'UPDATE_ERROR'; payload: string };

interface State {
  config: AppConfig;
  loading: boolean;
  error: string | null;
}

function configReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };
    case 'LOAD_SUCCESS':
    case 'UPDATE_SUCCESS':
      return { config: action.payload, loading: false, error: null };
    case 'LOAD_ERROR':
    case 'UPDATE_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(configReducer, {
    config: DEFAULT_CONFIG,
    loading: true,
    error: null,
  });

  const load = async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const config = await fetchConfig();
      dispatch({ type: 'LOAD_SUCCESS', payload: config });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '配置加载失败';
      dispatch({ type: 'LOAD_ERROR', payload: msg });
    }
  };

  const update = async (partial: AppConfigPartial) => {
    try {
      const config = await apiUpdateConfig(partial);
      dispatch({ type: 'UPDATE_SUCCESS', payload: config });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '配置保存失败';
      dispatch({ type: 'UPDATE_ERROR', payload: msg });
      throw err;
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ConfigContext.Provider
      value={{ config: state.config, loading: state.loading, error: state.error, updateConfig: update, reload: load }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

function useConfigContext(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfigContext 必须在 ConfigProvider 内部使用');
  return ctx;
}

export { ConfigProvider, useConfigContext };
