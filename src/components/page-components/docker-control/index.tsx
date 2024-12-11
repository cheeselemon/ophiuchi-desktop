import DockerIcon from "@/components/icons/docker";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CertificateManager } from "@/helpers/certificate-manager";
import { cn } from "@/lib/utils";
import proxyListStore from "@/stores/proxy-list";
import { appDataDir, resolveResource } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { useCallback, useState } from "react";
import DockerLogModal from "../proxy-list/docker-log";

export default function DockerControl({}: {}) {
  const { proxyList } = proxyListStore();
  const [dockerProcessStream, setDockerProcessStream] = useState<any>("");
  const [dockerModalOpen, setDockerModalOpen] = useState(false);
  const [dockerNeedsRestart, setDockerNeedsRestart] = useState(false);
  const [detailedLog, setDetailedLog] = useState<any>("");

  const appendDockerProcessStream = useCallback(
    (line: any, isDetail: boolean = false) => {
      if (typeof line === "string") {
        if (isDetail) {
        } else {
          setDockerProcessStream((prev: any) => prev + `\n${line}`);
        }
        setDetailedLog((prev: any) => prev + `\n${line}`);
      } else {
        if (isDetail) {
        } else {
          setDockerProcessStream((prev: any) => prev + line);
        }
        setDetailedLog((prev: any) => prev + line);
      }
    },
    []
  );

  const checkDockerContainerExists = async () => {
    const appDataDirPath = await appDataDir();
    const dockerComposePath = `${appDataDirPath}/docker-compose.yml`;
    const lines: string[] = [];
    return new Promise<boolean>((resolve) => {
      const command = Command.create("check-docker-container-exists", [
        "compose",
        "-f",
        dockerComposePath,
        "ps",
        "--all",
      ]);
      command.on("close", (data) => {
        // check lines
        // check line output data and find if "ophiuchi-nginx" exist
        const linesFlattened = lines.join("\n");
        appendDockerProcessStream(`${linesFlattened}`, true);
        if (linesFlattened.includes("ophiuchi-nginx")) {
          appendDockerProcessStream(
            `✅ Container exists. Ophiuchi will remove container...`
          );
          resolve(true);
        } else {
          appendDockerProcessStream(
            `🚧 Container doesn't exist. Ophiuchi will start container now.`
          );
          resolve(false);
        }
        // if (data.code == 0) {
        //   resolve(true);
        // } else {
        //   resolve(false);
        // }
      });
      command.on("error", (error) =>
        console.error(`command error: "${error}"`)
      );
      const child = command.spawn();

      appendDockerProcessStream(`👉 Checking if container exists...`);
      command.stdout.on("data", (line) => {
        // check line output data and find if "ophiuchi-nginx" exists
        lines.push(`${line}`);
      });
      // command.stderr.on("data", (line) => appendDockerProcessStream(`${line}`));
    });
  };

  const stopDocker = async () => {
    const appDataDirPath = await appDataDir();
    const certMgr = CertificateManager.shared();
    await certMgr.deleteAllNginxConfigurationFiles();

    return new Promise<void>((resolve, reject) => {
      const command = Command.create("stop-docker-compose", [
        "compose",
        "-f",
        `${appDataDirPath}/docker-compose.yml`,
        "down",
      ]);
      command.on("close", (data) => {
        if (data.code == 0) {
          appendDockerProcessStream(
            `✅ Remove container successfully finished!`
          );
          appendDockerProcessStream("💤 Waiting for Docker to settle...");
          setTimeout(() => {
            resolve();
          }, 2500);
        } else {
          appendDockerProcessStream(
            `🚨 Remove container failed with code ${data.code} and signal ${data.signal}`
          );
          return reject();
        }
      });
      command.on("error", (error) =>
        console.error(`command error: "${error}"`)
      );
      command.stdout.on("data", (line) =>
        appendDockerProcessStream(`${line}`, true)
      );
      command.stderr.on("data", (line) =>
        appendDockerProcessStream(`${line}`, true)
      );
      const child = command.spawn().then((child) => {
        appendDockerProcessStream(
          `Command spawned with pid ${child.pid}`,
          true
        );
      });
      appendDockerProcessStream(`👉 Stopping and removing container...`);
    });
  };

  const startDocker = async () => {
    setDockerModalOpen(true);
    setDockerNeedsRestart(false);
    setDockerProcessStream("");
    setDetailedLog("");

    const exists = await checkDockerContainerExists();
    if (exists) {
      await stopDocker();
    }

    const certMgr = CertificateManager.shared();
    const nginxGen = proxyList.map((proxy) => {
      return certMgr.generateNginxConfigurationFiles(
        proxy.hostname,
        proxy.port
      );
    });

    // generate nginx configuration files
    await Promise.all(nginxGen);

    const resourcePath = await resolveResource(
      "bundle/templates/docker-compose.yml.template"
    );

    console.log(`resourcePath: ${resourcePath}`);
    const dockerComposeTemplate = await readTextFile(resourcePath);

    appendDockerProcessStream(`👉 Starting container...`);
    await writeTextFile(`docker-compose.yml`, dockerComposeTemplate, {
      baseDir: BaseDirectory.AppData,
    });

    const appDataDirPath = await appDataDir();

    const command = Command.create("run-docker-compose", [
      "compose",
      "-f",
      `${appDataDirPath}/docker-compose.yml`,
      "up",
      "-d",
    ]);
    command.on("close", (data) => {
      if (data.code == 0) {
        appendDockerProcessStream(
          `✅ Starting container successfully finished!`
        );
      } else {
        appendDockerProcessStream(
          `🚨 Starting container failed with code ${data.code} and signal ${data.signal}`
        );
      }
    });
    command.on("error", (error) => console.error(`command error: "${error}"`));
    command.stdout.on("data", (line) =>
      appendDockerProcessStream(`${line}`, true)
    );
    command.stderr.on("data", (line) =>
      appendDockerProcessStream(`${line}`, true)
    );
    const child = await command.spawn();
    appendDockerProcessStream(`Command spawned with pid ${child.pid}`, true);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"default"}
            size="sm"
            onClick={() => {
              if (proxyList.length === 0) {
                return;
              }
              startDocker();
            }}
            className={cn(dockerNeedsRestart ? "animate-bounce" : "")}
            disabled={proxyList.length === 0}
          >
            <span className="flex items-center gap-2">
              <DockerIcon className="w-4 h-4" />
              Start Container
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={12}>
          <p>Start docker container to apply your current proxy list.</p>
        </TooltipContent>
      </Tooltip>

      <DockerLogModal
        stream={dockerProcessStream}
        detailedStream={detailedLog}
        isOpen={dockerModalOpen}
        onClosed={() => {
          setDockerModalOpen(false);
        }}
      />
    </>
  );
}
