import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

interface HostsStore {
  checkHostExists: (hostname: string) => Promise<boolean>;
  addHostToFile: (hostname: string, password: string) => Promise<void>;
  removeHostFromFile: (hostname: string, password: string) => Promise<void>;
}

export const hostsStore = create<HostsStore>()((set) => ({
  checkHostExists: async (hostname: string) => {
    try {
      const exists = await invoke<boolean>("check_host_exists", { hostname });
      return exists;
    } catch (e) {
      console.error("Error checking host existence:", e);
      return false;
    }
  },

  addHostToFile: async (hostname: string, password: string) => {
    try {
      await invoke("add_line_to_hosts", { hostname, password });
    } catch (e) {
      console.error("Error adding host to file:", e);
      throw e;
    }
  },

  removeHostFromFile: async (hostname: string, password: string) => {
    try {
      await invoke("delete_line_from_hosts", { hostname, password });
    } catch (e) {
      console.error("Error removing host from file:", e);
      throw e;
    }
  },
})); 