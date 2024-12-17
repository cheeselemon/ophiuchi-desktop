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
import { Separator } from "@/components/ui/separator";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

function SettingsPage() {
  const [appDataDirPath, setAppDataDirPath] = useState<string | null>(null);

  useEffect(() => {
    appDataDir().then(setAppDataDirPath);
  }, []);

  const onOpenFinder = useCallback(async () => {
    invoke("open_finder_or_explorer", {
      path: appDataDirPath,
    });
  }, [appDataDirPath]);

  // if(!appDataDirPath) {
  //   return null;
  // }

  return (
    <div className="">
      <div className="">
        <p>Settings</p>
      </div>
      <Separator />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Generated Files</CardTitle>
            <CardDescription>
              Generated certificates, nginx configuration files are saved at
              <br />
              <Code>{appDataDirPath}</Code>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p
              className="cursor-pointer underline"
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
            <CardTitle>Dark Mode</CardTitle>
            <CardDescription>Toggle the dark mode!</CardDescription>
          </CardHeader>
          <CardContent className="">
            <div className="p-1">
              <ModeToggle />
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
