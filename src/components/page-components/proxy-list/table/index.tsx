import { AddProxyDialog } from "@/components/page-components/add-proxy";
import PrepareButtons from "@/components/page-components/certificate-dialogs/cert-buttons";
import { AddProxyToGroupDialog } from "@/components/page-components/proxy-list/add-new/proxy-to-group";
import { DeleteProxyDialog } from "@/components/page-components/proxy-list/delete/delete-proxy-dialog";
import { EditGroupDialog } from "@/components/page-components/proxy-list/edit/group";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Code from "@/components/ui/code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { cn } from "@/lib/utils";
import proxyListStore from "@/stores/proxy-list";
import { Bookmark, CheckIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import DockerControl from "../../docker-control";

function GroupManageDropdown({ item }: { item: IProxyData }) {
  const { removeProxyFromGroup, addProxyToGroup, groupList, selectedGroup } =
    proxyListStore();

  const numberOfGroupsThisProxyIsIn = groupList.filter((group) => {
    return !!group.includedHosts.find((host) => host === item.hostname);
  }).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"} size={"sm"}>
          <Bookmark className="h-3.5 w-3.5" /> {numberOfGroupsThisProxyIsIn}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" sideOffset={4} align="end">
        <DropdownMenuLabel>Manage Proxy in Group</DropdownMenuLabel>
        {groupList.map((group) => {
          const isChecked = !!group.includedHosts.find(
            (host) => host === item.hostname
          );
          const isNoGroup = group.isNoGroup;
          const isSelectedGroup = group.id === selectedGroup?.id;
          return (
            <React.Fragment key={group.id}>
              <DropdownMenuCheckboxItem
                checked={isChecked || isNoGroup}
                disabled={isNoGroup}
                onClick={() => {
                  if (isNoGroup) {
                    return;
                  } else {
                    isChecked
                      ? removeProxyFromGroup(item, group)
                      : addProxyToGroup(item, group);
                  }
                }}
              >
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isSelectedGroup ? "underline" : ""
                  )}
                >
                  {group.name}
                </div>
              </DropdownMenuCheckboxItem>
              {isNoGroup && <DropdownMenuSeparator />}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ProxyListTable() {
  const { proxyList, selectedGroup, deleteProxyFromList, deleteGroup } =
    proxyListStore();

  const [loaded, setLoaded] = useState(false);

  const prepareConfigPage = useCallback(async () => {
    console.log("prepareConfigPage");
    setLoaded(true);
  }, []);

  useEffect(() => {
    prepareConfigPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tableCaption() {
    if (selectedGroup?.isNoGroup) {
      return (
        <>
          All of your proxies. <br />
          Start container here or add these proxies to the group to organize
          them.
        </>
      );
    }

    if (proxyList.length === 0) {
      return (
        <div className="text-yellow-500 dark:text-yellow-300">
          Add existing proxy in this group to start container for this group!
        </div>
      );
    } else {
      return (
        <>
          List of proxies in this group. <br />
          Press start Container to start the docker webserver.
        </>
      );
    }
  }

  return (
    <>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex h-6 items-center">
            {selectedGroup?.isNoGroup ? (
              "All Proxies"
            ) : (
              <div className="flex gap-2 items-center">
                <div>Proxy Group - {selectedGroup?.name}</div>
                <div className="flex">
                  <EditGroupDialog />
                </div>
              </div>
            )}
          </CardTitle>

          <CardDescription className="flex justify-end">
            <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <div className="flex gap-2 items-center">
                {selectedGroup?.isNoGroup ? (
                  <>
                    <DockerControl />
                    <AddProxyDialog
                      onDone={() => {
                        //
                      }}
                    />
                  </>
                ) : (
                  <>
                    <DockerControl />
                    <AddProxyToGroupDialog
                      onDone={() => {
                        //
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption className="text-xs">{tableCaption()}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[400px]">Hostname</TableHead>
                <TableHead>Application Port</TableHead>
                <TableHead>Ready to Launch</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proxyList.map((proxyItem) => {
                return (
                  <TableRow key={proxyItem.hostname}>
                    <TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            className="p-2 underline cursor-pointer text-sm sm:pl-0"
                            href={`https://${proxyItem.hostname}`}
                            target="_blank"
                          >
                            {proxyItem.hostname}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Click to open on browser.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {proxyItem.port}
                        {proxyList.filter((p) => p.port === proxyItem.port)
                          .length > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TriangleAlertIcon className="w-3 h-3 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This port is already used by another proxy.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {proxyItem.canLaunch ? (
                        <CheckIcon className="w-3 h-3 text-green-500" />
                      ) : (
                        <XIcon className="w-3 h-3 text-red-500" />
                      )}
                    </TableCell>

                    <TableCell className="flex gap-2 justify-end items-center">
                      <PrepareButtons item={proxyItem} />
                      <GroupManageDropdown item={proxyItem} />
                      {selectedGroup?.isNoGroup && (
                        <DeleteProxyDialog
                          proxy={proxyItem}
                          onDelete={() => deleteProxyFromList(proxyItem)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {selectedGroup?.isNoGroup ? null : (
            <div className="text-right pt-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant={"outline"} size="sm">
                    <span className="text-muted-foreground">Delete Group</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="">
                  <DialogHeader>
                    <DialogTitle>Delete Group</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this group? <br />
                      This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <Code>{selectedGroup?.name}</Code>
                  <DialogFooter>
                    <Button
                      variant={"destructive"}
                      onClick={() => {
                        if (selectedGroup) {
                          deleteGroup(selectedGroup?.id);
                        }
                      }}
                    >
                      Yes, delete.
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
