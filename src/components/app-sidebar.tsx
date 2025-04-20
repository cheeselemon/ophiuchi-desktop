"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import proxyListStore from "@/stores/proxy-list";
import systemStatusStore from "@/stores/system-status";
import {
  CheckCircle,
  CircleAlert,
  Computer,
  ExternalLinkIcon,
  HelpCircle,
  List,
  LoaderCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import packageJson from "../../package.json";
import DiscordIcon from "./icons/discord";
import { AddProxyGroupDialog } from "./page-components/proxy-list/add-new/group";
import UpdaterInterface from "./page-components/updater";
import { Badge } from "./ui/badge";

// Menu items.
const appItems = [
  // {
  //   title: "Status",
  //   url: "/test-page",
  //   icon: () => <Computer strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />,
  // },
  // {
  //   title: "Calendar",
  //   url: "#",
  //   icon: () => <Calendar strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />,
  // },
  // {
  //   title: "Search",
  //   url: "#",
  //   icon: () => <Search strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />,
  // },
  {
    title: "Settings",
    url: "/settings",
    icon: () => <Settings strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />,
  },
];

const helpItems = [
  {
    title: "Help",
    url: "https://heavenly-tent-fff.notion.site/Ophiuchi-Developers-Toolkit-734dc4f766fe40aebfe0da3cbbc304f5?pvs=4",
    isBlank: true,
    icon: () => <HelpCircle strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />,
    badgeText: <ExternalLinkIcon className="w-3 h-3" />,
  },
  {
    title: "Discord",
    url: "https://discord.gg/fpp8kNyPtz",
    isBlank: true,
    icon: () => <DiscordIcon className="w-3.5 h-3.5" />,
    badgeText: "Feedback",
  },
];

function DockerStatus() {
  const { isCheckDone, isDockerInstalled, isDockerContainerRunning } =
    systemStatusStore();

  if (!isCheckDone) {
    return <LoaderCircle className="animate-spin w-3 h-3" />;
  }

  if (!isDockerInstalled) {
    return <CircleAlert className="text-red-400 w-3 h-3" />;
  }

  if (!isDockerContainerRunning) {
    return <CheckCircle className="text-gray-400 w-3 h-3" />;
  }

  return <CheckCircle className="text-green-500 w-3 h-3" />;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { selectedGroup, groupList, setSelectedGroup, totalProxyList } =
    proxyListStore();

  return (
    <Sidebar collapsible="icon">
      {/* <div className="absolute top-2 -right-4">
        <div className="bg-sidebar rounded border">
          <SidebarTrigger />
        </div>
      </div> */}
      <SidebarHeader>
        <div className="flex gap-2 items-center px-1 pt-1">
          <img src="/app-icon.svg" className="w-8" alt="" />
          <p>Ophiuchi</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <UpdaterInterface />
        <SidebarGroupLabel>Application</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/"}>
                <Link href="/">
                  <List strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />
                  <span>Proxies</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuSub className="py-1 grid gap-0.5">
                {groupList.map((group) => {
                  const isMainPage = pathname === "/";
                  return (
                    <SidebarMenuSubItem
                      key={group.id}
                      className={cn(
                        "rounded-md hover:bg-accent-foreground/5",
                        selectedGroup?.id === group.id &&
                          "bg-accent-foreground/10 border-[0.5px] border-b-black/10 border-t-white/20 hover:bg-accent-foreground/10"
                      )}
                    >
                      <Link href={isMainPage ? "#" : "/"}>
                        {/* Purposely used div here because SidebarMenuSubItem is an <a> component and it will produce an error. */}
                        <div
                          className={cn(
                            "p-1 px-2 cursor-pointer flex justify-between items-center text-xs"
                          )}
                          onClick={() => setSelectedGroup(group)}
                        >
                          <span className={cn("text-xs")}>{group.name}</span>
                          {/* {selectedGroup?.id === group.id && (
                            <CheckIcon
                              size={ICON_SIZE}
                              className="text-muted-for"
                            />
                          )} */}
                          {!group.isNoGroup ? (
                            <span className="text-xs">
                              {group.includedHosts.length}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {totalProxyList.length}
                            </span>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuSubItem>
                  );
                })}
                <SidebarMenuSubItem>
                  <AddProxyGroupDialog onDone={() => {}} />
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/status"}>
                <Link href="/status">
                  <Computer strokeWidth={ICON_STROKE_WIDTH} size={ICON_SIZE} />
                  <span>Status</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuBadge>
                <DockerStatus />
              </SidebarMenuBadge>
            </SidebarMenuItem>
            {appItems.map((item) => {
              const isActive = item.url === pathname;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
        <SidebarGroupLabel>Help</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {helpItems.map((item) => {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      target={item.isBlank ? "_blank" : "_self"}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badgeText && (
                        <Badge
                          variant="outline"
                          className="text-[0.6rem] rounded-full text-muted-foreground font-normal"
                        >
                          {item.badgeText}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground px-2">
            v{packageJson.version}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
