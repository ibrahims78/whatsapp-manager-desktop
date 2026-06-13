interface Window {
  electronAPI?: {
    getAppVersion: () => Promise<string>;
    getAppPath: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    platform: string;
  };
}
