import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { IFileManagerBase } from "../file-manager";
import { CONFIG_DIR, GROUP_FILE_NAME, PROXY_FILE_NAME } from "./constants";
import { IProxyData, IProxyGroupData } from "./interfaces";
import { m001_createGroupIfNotExists } from "./migration/001-create-group";
import { m002_addProxyCreatedAt } from "./migration/002-add-proxy-created-at";

let mgr: ProxyManager | undefined = undefined;

export class ProxyManager implements IFileManagerBase {
  constructor() { }

  static sharedManager(): ProxyManager {
    if (!mgr) {
      mgr = new ProxyManager();
    }
    return mgr;
  }

  getBaseDir() {
    return BaseDirectory.AppData;
  }

  async boot() {
    const baseDir = this.getBaseDir();
    const dirExist = await exists(CONFIG_DIR, { baseDir });
    if (!dirExist) {
      await mkdir(CONFIG_DIR, { baseDir, recursive: true });
    }
    // create file if not exist
    const fileExist = await exists(`${CONFIG_DIR}/${PROXY_FILE_NAME}`, { baseDir });
    if (!fileExist) {
      await writeTextFile(
        `${CONFIG_DIR}/${PROXY_FILE_NAME}`,
        JSON.stringify([]),
        {
          baseDir,
        }
      );
    }

    await this.migrate();
  }

  async migrate() {
    await m001_createGroupIfNotExists(mgr!);
    await m002_addProxyCreatedAt(mgr!);
    return true;
  }

  async getProxies() {
    const baseDir = this.getBaseDir();
    const fileData = await readTextFile(`${CONFIG_DIR}/${PROXY_FILE_NAME}`, {
      baseDir,
    });
    const endpointList = JSON.parse(fileData) as IProxyData[];
    return endpointList;
  }

  async getGroups() {
    const baseDir = this.getBaseDir();
    const fileData = await readTextFile(`${CONFIG_DIR}/${GROUP_FILE_NAME}`, {
      baseDir,
    });
    const groupList = JSON.parse(fileData) as IProxyGroupData[];
    return groupList;
  }

  async saveGroups(data: IProxyGroupData[]) {
    const baseDir = this.getBaseDir();

    const cleaned: IProxyGroupData[] = data.map((d) => {
      const cleanedincludedHosts = d.includedHosts.map((p) => {
        if (typeof p === "object") {
          return (p as IProxyData).hostname;
        }
        return p;
      });
      return {
        ...d,
        updatedAt: new Date().toISOString(),
        includedHosts: cleanedincludedHosts,
      };
    });
    await writeTextFile(
      `${CONFIG_DIR}/${GROUP_FILE_NAME}`,
      JSON.stringify(cleaned),
      {
        baseDir,
      }
    );
  }

  async saveProxies(data: any) {
    const baseDir = this.getBaseDir();
    await writeTextFile(
      `${CONFIG_DIR}/${PROXY_FILE_NAME}`,
      JSON.stringify(data),
      {
        baseDir,
      }
    );
  }

  async getProxyInGroup(groupName: string) {
    const groups = await this.getGroups();
    const proxies = await this.getProxies();
    const identifiedGroup = groups.filter((p) => p.name === groupName);
    const mapped = identifiedGroup.map((g) => {
      return g.includedHosts.map((host) => {
        return proxies.find((p) => p.hostname === host);
      });
    });

    console.log(mapped);
    return mapped;
  }
}
