import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { ProxyManager } from "..";
import {
  CONFIG_DIR,
  DEFAULT_PROXY_GROUP_ID,
  DEFAULT_PROXY_GROUP_NAME,
  GROUP_FILE_NAME,
} from "../constants";
import { IProxyGroupData } from "../interfaces";

export async function m001_createGroupIfNotExists(mgrInstance: ProxyManager) {
  const baseDir = mgrInstance.getBaseDir();
  const dirExist = await exists(CONFIG_DIR, { baseDir });
  if (!dirExist) {
    await mkdir(CONFIG_DIR, { baseDir, recursive: true });
  }
  // create group file if not exists
  const fileExists = await exists(`${CONFIG_DIR}/${GROUP_FILE_NAME}`, { baseDir });
  if (!fileExists) {
    const defaultGroup: IProxyGroupData = {
      id: DEFAULT_PROXY_GROUP_ID,
      name: DEFAULT_PROXY_GROUP_NAME,
      includedHosts: [],
      isNoGroup: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeTextFile(
      `${CONFIG_DIR}/${GROUP_FILE_NAME}`,
      JSON.stringify([defaultGroup]),
      {
        baseDir,
      }
    );
  }
}
