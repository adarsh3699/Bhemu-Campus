import { NativeModule, requireNativeModule } from 'expo';

export type EventSubscription = { remove: () => void };

type DownloadCompleteEvent = {
  downloadId: number;
  uri: string;
};

export type DownloadStatus = {
  downloadId: number;
  status: "pending" | "running" | "successful" | "failed" | "paused" | "unknown";
  uri?: string;
};

declare class BhemuUpdaterModule extends NativeModule<{
  onDownloadComplete: (event: DownloadCompleteEvent) => void;
}> {
  downloadApk(url: string, filename: string, title: string, description: string, mimeType: string): Promise<number>;
  canInstallPackages(): Promise<boolean>;
  getDownloadStatus(downloadId: number): Promise<DownloadStatus | null>;
}

export default requireNativeModule<BhemuUpdaterModule>('BhemuUpdater');
