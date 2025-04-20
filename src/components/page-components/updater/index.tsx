"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, Update } from "@tauri-apps/plugin-updater";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function UpdaterInterface() {
  const [theUpdate, setTheUpdate] = useState<Update | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState(0);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const update = await check();
        setTheUpdate(update);
      } catch (error) {
        console.error(`error`, error);
      }
    };
    checkUpdate();
  }, []);

  const handleInstall = async () => {
    setIsDownloading(true);
    let downloaded = 0;
    let contentLength = 0;
    await theUpdate?.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength ?? 0;
          setContentLength(contentLength);
          console.log(`started downloading ${event.data.contentLength} bytes`);
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          setDownloaded(downloaded);
          console.log(`downloaded ${downloaded} from ${contentLength}`);
          break;
        case "Finished":
          console.log("download finished");
          setIsDownloading(false);
          setCanInstall(true);
          break;
      }
    });
    await relaunch();
  };

  const buttonInterface = () => {
    if (isDownloading) {
      return <Progress value={downloaded} max={contentLength} />;
    }
    return (
      <Button
        variant="default"
        size="xs"
        className="w-full"
        onClick={handleInstall}
      >
        Install and restart
      </Button>
    );
  };

  if (!theUpdate) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle className="text-xs">Update available!</CardTitle>
        <CardDescription>v{theUpdate.version}</CardDescription>
        <div className="absolute top-0 right-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheUpdate(null)}
          >
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs">{buttonInterface()}</CardContent>
    </Card>
  );
}
