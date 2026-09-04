import { NativeModule, requireNativeModule } from 'expo';

export type EventSubscription = { remove: () => void };

type DownloadCompleteEvent = {
  downloadId: number;
  uri: string;
};

declare class BhemuUpdaterModule extends NativeModule<{
  onDownloadComplete: (event: DownloadCompleteEvent) => void;
}> {
  downloadApk(url: string, filename: string, title: string, description: string, mimeType: string): Promise<number>;
}

export default requireNativeModule<BhemuUpdaterModule>('BhemuUpdater');
