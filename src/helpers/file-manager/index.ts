import { BaseDirectory } from "@tauri-apps/plugin-fs";

export interface IFileManagerBase {
  boot: () => Promise<void>;
  getBaseDir: () => BaseDirectory;
  migrate: () => Promise<boolean>;
  getProxies: () => Promise<any>;
  saveProxies: (data: any) => Promise<any>;
}
