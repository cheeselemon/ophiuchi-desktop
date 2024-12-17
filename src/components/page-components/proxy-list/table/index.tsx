import { AddProxyDialog } from "@/components/page-components/add-proxy";
import CertButtons from "@/components/page-components/certificate-dialogs/cert-buttons";
import { AddProxyToGroupDialog } from "@/components/page-components/proxy-list/add-new/proxy-to-group";
import { EditGroupDialog } from "@/components/page-components/proxy-list/edit/group";
import RequestPasswordModal from "@/components/page-components/proxy-list/request-certificate-trust";
import { Button } from "@/components/ui/button";
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
import proxyListStore from "@/stores/proxy-list";
import { Label } from "@radix-ui/react-label";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export default function ProxyListTable() {
  const {
    load,
    proxyList,
    selectedGroup,
    removeProxyFromList,
    removeProxyFromGroup,
    deleteGroup,
  } = proxyListStore();

  const [loaded, setLoaded] = useState(false);
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
          Press start Container to start the docker webserver.
        </>
      );
    }
  }

  return (
    <>
      {/* <CreateProxyV2SideComponent open={openSide} setOpen={setOpenSide} /> */}
      <RequestPasswordModal
        description={"Ophiuchi wants to edit: /etc/hosts."}
        isOpen={passwordModalShown}
        onConfirm={function (password: string): void {
          setPasswordModalOpen(false);
          if (!currentEndpoint) return;
          onDeleteFromHosts(currentEndpoint, password);
          const configHelper = CertificateManager.shared();
          configHelper.deleteCertificateFiles(currentEndpoint.hostname);
          configHelper.deleteNginxConfigurationFiles(currentEndpoint.hostname);

          removeProxyFromList(currentEndpoint);
        }}
      />
      <div className="px-6 border border-zinc-700 rounded-md py-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <Label className="font-medium leading-6  ">
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
              <AddProxyDialog
                onDone={() => {
                  //
                }}
              />
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
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxyList.map(async (proxyItem) => {
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
                        <TableCell>{proxyItem.port}</TableCell>

                        <TableCell>
                          <CertButtons item={proxyItem} />
                        </TableCell>

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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      {selectedGroup?.isNoGroup ? null : (
        <div className="text-right pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant={"ghost"} size="sm">
                <span className="text-muted-foreground">Delete Group</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="">
              <DialogHeader>
                <DialogTitle>Delete Group</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this group?
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
    </>
  );
}
