import { HotList, Platform } from '@shared/types';

interface IAdapter {
  readonly platform: Platform;
  readonly platformName: string;
  readonly sourceName: string;
  fetchHotList(): Promise<HotList>;
}

export { IAdapter };
