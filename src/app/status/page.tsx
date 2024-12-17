"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Code from "@/components/ui/code";
import { Separator } from "@/components/ui/separator";
import systemStatusStore from "@/stores/system-status";
import dynamic from "next/dynamic";

function SettingsPage() {
  const { isDockerInstalled, isDockerContainerRunning, runningContainerInfo } =
    systemStatusStore();

  return (
    <div className="">
      <div className="">
        <p>Status</p>
      </div>
      <Separator />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Docker Intallation</CardTitle>
            <CardDescription>
              Docker is required to run the proxy server.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
              {isDockerInstalled ? (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
              ) : (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-rose-500" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {isDockerInstalled
                    ? "Docker found on system."
                    : "Docker is not found on system."}
                </p>
                <p className="text-sm text-muted-foreground">
                  A command <Code>docker --version</Code> is run to check if the
                  Docker is installed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Docker Container</CardTitle>
            <CardDescription>Checks if container is running.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
              {isDockerContainerRunning ? (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
              ) : (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-rose-500" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {isDockerContainerRunning
                    ? "Container is running."
                    : "Container is not running."}
                </p>
                <p className="text-sm text-muted-foreground">
                  A command <Code>docker compose</Code> is run periodically to
                  check if the container is running.
                </p>
                <div className="text-sm text-muted-foreground">
                  {isDockerContainerRunning && (
                    <>
                      <p>
                        Project name:{" "}
                        <Code>{runningContainerInfo?.Project}</Code>
                      </p>
                      <p>
                        Container name:{" "}
                        <Code>{runningContainerInfo?.Name}</Code>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SettingsPage), {
  ssr: false,
});
