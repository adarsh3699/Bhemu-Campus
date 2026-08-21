export interface AppUpdateManifest {
	version: string;
	apkUrl: string;
	websiteUrl: string;
	releaseNotes: string[];
	mandatory: boolean;
}

export interface AvailableAppUpdate {
	manifest: AppUpdateManifest;
}

export interface DownloadProgress {
	bytesDownloaded: number;
	bytesTotal: number | null;
	progress: number | null;
}
