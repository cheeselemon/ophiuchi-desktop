import { Button } from "@/components/ui/button";
import Code from "@/components/ui/code";
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
import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { cn } from "@/lib/utils";
import proxyListStore from "@/stores/proxy-list";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Label } from "@radix-ui/react-label";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { useCallback, useEffect, useState } from "react";
import CreateProxyV2SideComponent from "../add-new";
import { AddProxyToGroupDialog } from "../add-new/proxy-to-group";
import { EditGroupDialog } from "../edit/group";
import RequestPasswordModal from "../request-certificate-trust";

export default function ProxyListTable() {
  const {
    load,
    proxyList,
    selectedGroup,
    removeProxyFromList,
    removeProxyFromGroup,
  } = proxyListStore();

  const [loaded, setLoaded] = useState(false);
  const [openSide, setOpenSide] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<IProxyData>();
  const [passwordModalShown, setPasswordModalOpen] = useState(false);

  const onDeleteFromHosts = useCallback(
    async (endpoint: IProxyData, password: string) => {
      invoke("delete_line_from_hosts", {
        hostname: endpoint.hostname,
        password: password,
      });
    },
    []
  );

  const onDeleteEndpoint = useCallback(async (endpoint: IProxyData) => {
    setCurrentEndpoint(endpoint);
    const confirmed = await confirm(
      `Are you sure to delete ${endpoint.nickname}?`
    );
    if (!confirmed) {
      return;
    }

    invoke("remove_cert_from_keychain", {
      name: `${endpoint.hostname}`,
    });
    setPasswordModalOpen(true);
  }, []);

  const openCert = useCallback(async (data: IProxyData) => {
    const appDataDirPath = await appDataDir();
    const certPath = `${appDataDirPath}/cert/${data.hostname}`;
    shellOpen(certPath);
  }, []);

  const prepareConfigPage = useCallback(async () => {
    load();
    setLoaded(true);
  }, [load]);

  useEffect(() => {
    prepareConfigPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tableCaption() {
    if (selectedGroup?.isNoGroup) {
      return (
        <>
          A list of your current proxies. <br /> Press Start Container to start
          the docker webserver.
        </>
      );
    }

    if (proxyList.length === 0) {
      return (
        <div className="text-yellow-200">
          Add existing proxy in this group to start container for this group!
        </div>
      );
    } else {
      return (
        <>
          {" "}
          list of proxies in this group. <br />
          Press start sontainer to start the docker webserver.
        </>
      );
    }
  }

  return (
    <>
      <CreateProxyV2SideComponent open={openSide} setOpen={setOpenSide} />
      <RequestPasswordModal
        description={"Ophiuchi wants to edit: /etc/hosts."}
        isOpen={passwordModalShown}
        onConfirm={function (password: string): void {
          setPasswordModalOpen(false);
          if (!currentEndpoint) return;
          onDeleteFromHosts(currentEndpoint, password);
          const configHelper = new CertificateManager();
          configHelper.deleteCertificateFiles(currentEndpoint.hostname);
          configHelper.deleteNginxConfigurationFiles(currentEndpoint.hostname);

          removeProxyFromList(currentEndpoint);
        }}
      />
      <div className="px-6 border border-zinc-700 rounded-md py-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <Label className="font-medium leading-6 text-white">
              {selectedGroup?.isNoGroup ? (
                "Proxy List"
              ) : (
                <div className="flex gap-2 items-center">
                  <div>Proxy Group - {selectedGroup?.name}</div>
                  <div className="flex">
                    <EditGroupDialog />
                  </div>
                </div>
              )}
            </Label>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            {selectedGroup?.isNoGroup ? (
              <Button
                variant={"default"}
                size="sm"
                className={cn(
                  "flex gap-2 items-center",
                  proxyList.length === 0 ? "animate-bounce" : ""
                )}
                onClick={() => {
                  setOpenSide(true);
                }}
              >
                <PlusIcon className="w-4 h-4" />
                Create New Proxy
              </Button>
            ) : (
              <AddProxyToGroupDialog
                onDone={() => {
                  //
                }}
              />
            )}
          </div>
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table>
                <TableCaption>{tableCaption()}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">Hostname</TableHead>
                    <TableHead>Application Port</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxyList.map((proxyItem) => (
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
                      <TableCell>{proxyItem.port}</TableCell>

                      <TableCell className="text-right">
                        {/* <p
                          onClick={() => {
                            openCert(proxyItem);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Locate Cert
                        </p> */}
                        {selectedGroup?.isNoGroup ? (
                          <Button
                            size={"sm"}
                            variant={"destructive"}
                            onClick={() => {
                              onDeleteEndpoint(proxyItem);
                            }}
                          >
                            Delete
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size={"sm"}
                                variant={"ghost"}
                                onClick={() => {
                                  if (!selectedGroup) return;
                                  removeProxyFromGroup(
                                    proxyItem,
                                    selectedGroup
                                  );
                                }}
                              >
                                Remove from Group
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>
                                Remove this proxy from the group{" "}
                                <Code>{selectedGroup?.name}</Code>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
