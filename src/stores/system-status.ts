import { appDataDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { create } from "zustand";

export interface DockerContainerStatus {
  containerInfo: IContainer | null;
  isRunning: boolean;
  error?: string;
}

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
  setIsDockerContainerRunning: (
    running: boolean,
    containerInfo: IContainer | null
  ) => void;
  updateDockerContainerStatus: () => Promise<DockerContainerStatus>;
  checkDockerContainerStatus: (
    dockerComposePath: string
  ) => Promise<DockerContainerStatus>;
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
  setIsDockerContainerRunning: (running, containerInfo) =>
    set({
      isDockerContainerRunning: running,
      runningContainerInfo: containerInfo,
    }),
  updateDockerContainerStatus: async () => {
    const appDataDirPath = await appDataDir();
    const dockerComposePath = `${appDataDirPath}/docker-compose.yml`;
    const status = await get().checkDockerContainerStatus(dockerComposePath);
    set({
      isDockerContainerRunning: status.isRunning,
      runningContainerInfo: status.containerInfo,
    });
    return status;
  },
  checkDockerContainerStatus: async (
    dockerComposePath: string
  ): Promise<DockerContainerStatus> => {
    try {
      // Execute docker compose ps command
      const command = Command.create("check-docker-container", [
        "compose",
        "-f",
        dockerComposePath,
        "ps",
        "--format",
        "json", // Use JSON format for easier parsing
      ]);

      const result = await command.execute();

      if (result.code !== 0) {
        console.log(
          `Docker command failed with status ${result.code}: ${result.stderr}`
        );
        return {
          containerInfo: null,
          isRunning: false,
          error: `Docker command failed with status ${result.code}: ${result.stderr}`,
        };
      }

      // Parse the JSON output
      const containers = JSON.parse(result.stdout);
      // console.log(containers);
      // Check if any container is running
      // Docker compose ps returns an array of containers with their states
      const runningContainers = containers.filter(
        (container: any) =>
          container.State === "running" && container.Name === "ophiuchi-nginx"
      );

      return {
        containerInfo:
          runningContainers.length > 0 ? runningContainers[0] : null,
        isRunning: runningContainers.length > 0,
      };
    } catch (error) {
      return {
        containerInfo: null,
        isRunning: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
}));

export default systemStatusStore;
