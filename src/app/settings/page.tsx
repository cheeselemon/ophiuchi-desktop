"use client";

import { ModeToggle } from "@/components/page-components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Code from "@/components/ui/code";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir, homeDir } from "@tauri-apps/api/path";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

function SettingsPage() {
  const [appDataDirPath, setAppDataDirPath] = useState<string | null>(null);
  const [homeDirPath, setHomeDirPath] = useState<string | null>(null);

  useEffect(() => {
    appDataDir().then(setAppDataDirPath);
    homeDir().then(setHomeDirPath);
  }, []);

  const onOpenFinder = useCallback(async () => {
    invoke("open_finder_or_explorer", {
      path: appDataDirPath,
    });
  }, [appDataDirPath]);

  const onOpenBackupFiles = useCallback(async () => {
    invoke("open_finder_or_explorer", {
      path: `${homeDirPath}/ophiuchi.hosts.bak`,
    });
  }, [homeDirPath]);

  // if(!appDataDirPath) {
  //   return null;
  // }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex h-6 items-center">Settings</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Files</CardTitle>
            <CardDescription className="space-y-2">
              <div>
                Required files to run nginx proxy localhost servers, such as
                self-signed certificates, nginx configuration files and
                docker-compose.yml files can be found at:
              </div>
              <div className="">
                <Code type="block" className="text-xs">
                  {appDataDirPath}
                </Code>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex">
            <p
              className="cursor-pointer underline text-xs"
              onClick={() => {
                onOpenFinder();
              }}
            >
              Show in Finder....
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Backup Files</CardTitle>
            <CardDescription className="space-y-2">
              <div>
                Whenever Ophiuchi makes changes to the /etc/hosts file, a backup
                is created at:
              </div>
              <div className="">
                <Code
                  type="block"
                  className="text-xs"
                >{`${homeDirPath}/ophiuchi.hosts.bak`}</Code>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex">
            <p
              className="cursor-pointer underline text-xs"
              onClick={() => {
                onOpenBackupFiles();
              }}
            >
              Show in Finder....
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dark/Light Mode</CardTitle>
            <CardDescription>
              Toggle between dark and light mode, or auto-detect system theme.
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="">
              <ModeToggle />
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
