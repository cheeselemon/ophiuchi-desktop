"use client";

import DiscordIcon from "@/components/icons/discord";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import proxyListStore from "@/stores/proxy-list";
import { appDataDir } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useCallback } from "react";
import DockerControl from "../docker-control";
import { ProxyGroupSelect } from "./group-select";
import ProxyListTable from "./table";

export default function ProxyListComponent() {
  const { proxyList } = proxyListStore();

  const openAppData = useCallback(async () => {
    const appDataDirPath = await appDataDir();
    shellOpen(appDataDirPath);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col min-h-screen text-gray-100 bg-zinc-900">
        <div className="">
          <div className="flex justify-between w-full fixed top-0 left-0 right-0 bg-zinc-700 px-6 py-2 ">
            <div className="flex items-center">Ophiuchi</div>
            {/* <div className="flex gap-2 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="p-2 underline cursor-pointer text-sm"
                    onClick={() => {
                      openAppData();
                    }}
                  >
                    Open docker-compose folder
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Opens the folder where docker-compose.yml is located.</p>
                </TooltipContent>
              </Tooltip>
            </div> */}
            <div className="flex gap-2 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    className="p-2 underline cursor-pointer text-sm"
                    href={`https://heavenly-tent-fff.notion.site/Ophiuchi-Developers-Toolkit-734dc4f766fe40aebfe0da3cbbc304f5?pvs=4`}
                    target="_blank"
                  >
                    Help
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Open help docs.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="https://discord.gg/fpp8kNyPtz" target="_blank">
                    <DiscordIcon className="w-4 h-4 text-white" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={12}>
                  <p>Get help from Discord.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="p-4 mt-20">
          <div className="flex flex-col gap-2 mb-4">
            <Label className="text-base font-medium">Select Group</Label>
            <div className="flex gap-2 items-center">
              <ProxyGroupSelect
                onAddGroupButton={() => {
                  // wow!
                }}
              />
              <DockerControl />
            </div>
          </div>
          <ProxyListTable />
        </div>
      </div>
    </TooltipProvider>
  );
}
