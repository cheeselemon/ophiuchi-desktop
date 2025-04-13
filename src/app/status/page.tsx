"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Code from "@/components/ui/code";
import systemStatusStore from "@/stores/system-status";
import dynamic from "next/dynamic";

function SettingsPage() {
  const { isDockerInstalled, isDockerContainerRunning, runningContainerInfo } =
    systemStatusStore();

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex h-6 items-center">Status</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Card className="">
          <CardHeader>
            <CardTitle>Docker Intallation</CardTitle>
            <CardDescription>
              Ophiuchi uses Docker + nginx to run the proxy server. If you
              don&apos;t have Docker installed, you can install it from the
              official website:
              <a
                href="https://docs.docker.com/get-docker/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                Get Docker
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 ">
            <div className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
              {isDockerInstalled ? (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-green-500" />
              ) : (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-rose-500" />
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium leading-none">
                  {isDockerInstalled
                    ? "Docker found on system."
                    : "Docker is not found on system."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Docker Container</CardTitle>
            <CardDescription>
              Ophiuchi creates and runs a Docker container to run the proxy
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
              {isDockerContainerRunning ? (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-green-500" />
              ) : (
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-rose-500" />
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium leading-none">
                  {isDockerContainerRunning
                    ? "Container is running."
                    : "Container is not running."}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {isDockerContainerRunning ? (
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
                  ) : (
                    <p>
                      Container name will be shown here after you start the
                      container.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

export default dynamic(() => Promise.resolve(SettingsPage), {
  ssr: false,
});
