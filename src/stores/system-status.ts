import { create } from "zustand";

export interface IContainer {
  State: string;
  Name: string;
  Project: string;
}

interface SystemStatusStore {
  isCheckDone: boolean;
  isDockerInstalled: boolean;
  isDockerContainerRunning: boolean;
  runningContainerInfo: IContainer | null;
  isEverythingOk: () => boolean;
  setIsCheckDone: (checking: boolean) => void;
  setIsDockerInstalled: (installed: boolean) => void;
  setIsDockerContainerRunning: (running: boolean, containerInfo: IContainer | null) => void;
}

const systemStatusStore = create<SystemStatusStore>((set, get) => ({
  isCheckDone: false,
  isDockerInstalled: false,
  isDockerContainerRunning: false,
  runningContainerInfo: null,
  isEverythingOk: () => {
    const { isCheckDone, isDockerInstalled } = get();
    return isCheckDone && isDockerInstalled;
  },
  setIsCheckDone: (checking) => set({ isCheckDone: checking }),
  setIsDockerInstalled: (installed) => set({ isDockerInstalled: installed }),
  setIsDockerContainerRunning: (running, containerInfo) => set({ isDockerContainerRunning: running, runningContainerInfo: containerInfo }),
}));

export default systemStatusStore;