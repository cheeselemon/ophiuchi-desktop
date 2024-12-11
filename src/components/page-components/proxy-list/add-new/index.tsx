/* eslint-disable react/no-unescaped-entities */
"use client";

import { Button } from "@/components/ui/button";
import Code from "@/components/ui/code";
import MultiStateButton from "@/components/ui/multi-state-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { cn } from "@/lib/utils";
import proxyListStore from "@/stores/proxy-list";
import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowRightIcon,
  FingerPrintIcon,
  KeyIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { Roboto_Mono } from "next/font/google";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import RequestPasswordModal from "../request-certificate-trust";

const roboto = Roboto_Mono({ subsets: ["latin"] });
const certMgr = CertificateManager.shared();

export default function CreateProxyV2SideComponent({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { addProxyItem, selectedGroup } = proxyListStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [createStep, setCreateStep] = useState<number>(0);
  const [currentData, setCurrentData] = useState<IProxyData | null>(null);

  const [shouldGenerateSSLCert, setShouldGenerateSSLCert] = useState(false);
  const [sslCertGenComplete, setSSLCertGenComplete] = useState(false);

  const [shouldAddCertToKeychain, setShouldAddCertToKeychain] = useState(false);
  const [keychainAddComplete, setKeychainAddComplete] = useState(false);

  const [addToEtcHostsDone, setAddToEtcHostsDone] = useState(false);

  const [generateNginxConfDone, setGenerateNginxConfDone] = useState(false);

  const [passwordModalShown, setPasswordModalOpen] = useState(false);

  const onAddButton = useCallback(async (data: IProxyData) => {
    setCreateStep(1);
    setCurrentData(data);
    //
    // gen cert
    // const pems = await certMgr.generateCertificate(data.hostname);
    // const conf = await certMgr.generateNginxConfigurationFiles(
    //   data.hostname,
    //   data.port
    // );
    // setIsGenerating(false);
    // setOpen(false);
    // onAddFinish(data);
  }, []);

  const resetAndClose = useCallback(() => {
    setCreateStep(0);
    setCurrentData(null);
    setShouldGenerateSSLCert(false);
    setSSLCertGenComplete(false);
    setKeychainAddComplete(false);
    setAddToEtcHostsDone(false);
    setGenerateNginxConfDone(false);
    setOpen(false);
  }, [setOpen]);

  const onAddCertToKeychain = useCallback(async () => {
    if (!currentData) return;
    setShouldAddCertToKeychain(true);
    const appDataDirPath = await appDataDir();
    const pemFilePath = `${appDataDirPath}/cert/${currentData.hostname}/cert.pem`;
    // support for whitespaces in path
    // const whiteSpaced = pemFilePath.replace(/ /g, "\\ ");
    invoke("remove_cert_from_keychain", {
      name: `${currentData.hostname}`,
    });

    invoke("add_cert_to_keychain", {
      pem_file_path: `${pemFilePath}`,
    })
      .then(() => {
        setShouldAddCertToKeychain(false);
        setKeychainAddComplete(true);
      })
      .catch((e) => {
        console.error(e);
        message(e, { title: "Error" });
      });
  }, [currentData]);

  const onAddToHosts = useCallback(
    async (endpoint: IProxyData, password: string) => {
      invoke("add_line_to_hosts", {
        hostname: endpoint.hostname,
        password: password,
      });
      setAddToEtcHostsDone(true);
    },
    []
  );

  const onGenerateNginxConf = useCallback(async () => {
    if (!currentData) return;
    const conf = await certMgr.generateNginxConfigurationFiles(
      currentData.hostname,
      currentData.port
    );
    setGenerateNginxConfDone(true);
  }, [currentData]);

  useEffect(() => {
    if (shouldGenerateSSLCert && currentData) {
      certMgr.generateCertificate(currentData.hostname).then((pems) => {
        console.log(pems);
        setSSLCertGenComplete(true);
      });
    }
  }, [shouldGenerateSSLCert, currentData]);

  return (
    <>
      <RequestPasswordModal
        description={"Ophiuchi wants to edit: /etc/hosts."}
        isOpen={passwordModalShown}
        onConfirm={function (password: string): void {
          setPasswordModalOpen(false);
          if (!currentData) return;
          onAddToHosts(currentData, password);
        }}
        onClose={function (): void {
          setPasswordModalOpen(false);
        }}
      />
      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => {
            // do nothing
          }}
        >
          {/* {isGenerating && (
          <div className="fixed inset-0 z-10 bg-white bg-opacity-30 backdrop-blur-sm">
            <div className="w-full h-full flex flex-col gap-8 justify-center items-center">
              <div className="w-8 h-8 animate-ping rounded-full bg-green-500"></div>
              <div className="text-xs">
                Generating SSL certificate. It may take a while...
              </div>
            </div>
          </div>
        )} */}
          <div className="fixed inset-0 overflow-hidden bg-zinc-950 bg-opacity-50 backdrop-blur-sm">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300 sm:duration-500"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300 sm:duration-500"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-full">
                    <div className="flex h-full flex-col overflow-y-scroll bg-zinc-950 py-6 shadow-xl">
                      <div className="px-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <Dialog.Title className="text-lg font-semibold leading-6 text-white">
                            Let's create a new proxy!
                          </Dialog.Title>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                              onClick={() => resetAndClose()}
                            >
                              <span className="absolute -inset-2.5" />
                              <span className="sr-only">Close panel</span>
                              <XMarkIcon
                                className="h-6 w-6"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-6 flex-1 px-4 sm:px-6">
                        {createStep === 0 && (
                          <CreateFormComponent
                            onNextButton={(data) => {
                              onAddButton(data);
                            }}
                          />
                        )}
                        {createStep >= 1 && (
                          <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto h-full justify-center">
                            <div className="flex flex-col gap-4 text-center bg-zinc-700 rounded-lg p-4">
                              <h1 className="text-xl font-semibold">
                                http://localhost:
                                <span className="text-yellow-500">
                                  {currentData?.port}
                                </span>
                              </h1>
                              <p>👇</p>
                              <h1 className="text-xl font-semibold">
                                https://
                                <span className="text-yellow-500">
                                  {currentData?.hostname}
                                </span>
                              </h1>
                            </div>
                            <div className="flex flex-col divide-y divide-gray-500">
                              <h3 className="text-lg font-medium py-4">
                                Next, click each buttons to proceed:
                              </h3>
                              <div className="flex justify-between items-center py-8">
                                <p className="flex gap-2 items-center">
                                  1. Generate SSL Certificate{" "}
                                  <Popover>
                                    <PopoverTrigger>
                                      <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </PopoverTrigger>
                                    <PopoverContent side="top">
                                      A self-signed SSL certificate will be
                                      generated for the hostname. This is
                                      required for the browser to trust the
                                      connection. You can locate them after the
                                      wizard is done.
                                    </PopoverContent>
                                  </Popover>
                                </p>
                                <div className="flex flex-col items-end gap-4">
                                  <MultiStateButton
                                    notReady={{
                                      current: false,
                                      string: "Generate",
                                    }}
                                    ready={{
                                      current: !shouldGenerateSSLCert,
                                      string: "Generate",
                                      onClick: function (): void {
                                        setShouldGenerateSSLCert(true);
                                      },
                                    }}
                                    done={{
                                      current: sslCertGenComplete,
                                      string: "Done!",
                                      onClick: function (): void {
                                        // do nothing
                                      },
                                    }}
                                  />
                                  {sslCertGenComplete === true && (
                                    <p
                                      className="text-zinc-400 text-sm underline cursor-pointer"
                                      onClick={async () => {
                                        const appDataDirPath =
                                          await appDataDir();
                                        invoke("open_finder_or_explorer", {
                                          path: `${appDataDirPath}/cert/${currentData?.hostname}`,
                                        });
                                      }}
                                    >
                                      Locate certificates on Finder...
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between items-center py-8">
                                <p className="flex gap-2 items-center">
                                  2. Add certificate to Keychain Access & trust
                                  certificate{" "}
                                  <Code style="sudo">
                                    <span className="flex gap-1 items-center">
                                      <KeyIcon className="w-4 h-4" />/
                                      <FingerPrintIcon className="w-4 h-4" />
                                    </span>
                                  </Code>
                                  <Popover>
                                    <PopoverTrigger>
                                      <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </PopoverTrigger>
                                    <PopoverContent side="top">
                                      The certificate will be added to the
                                      keychain and trusted. This is required for
                                      the browser to trust the connection. You
                                      will be asked for your password or
                                      fingerprint depending on your system.
                                    </PopoverContent>
                                  </Popover>
                                </p>
                                <div className="flex flex-col items-end">
                                  <MultiStateButton
                                    notReady={{
                                      current: !sslCertGenComplete,
                                      string: "Add & Trust",
                                    }}
                                    ready={{
                                      current: sslCertGenComplete,
                                      string: "Add & Trust",
                                      onClick: function (): void {
                                        onAddCertToKeychain();
                                      },
                                    }}
                                    done={{
                                      current: keychainAddComplete,
                                      string: "Done!",
                                      onClick: function (): void {
                                        // do nothing
                                      },
                                    }}
                                  />
                                  {sslCertGenComplete === true && (
                                    <p
                                      className="text-zinc-400 text-sm underline cursor-pointer"
                                      onClick={async () => {
                                        const appDataDirPath =
                                          await appDataDir();
                                        invoke("open_finder_or_explorer", {
                                          path: `${appDataDirPath}/cert/${currentData?.hostname}`,
                                        });
                                      }}
                                    >
                                      I'll do it myself...
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-between items-center py-8">
                                <p className="flex gap-2 items-center">
                                  3. Update <Code>/etc/hosts</Code> file{" "}
                                  <Code style="sudo">
                                    <KeyIcon className="w-4 h-4" />
                                  </Code>
                                  <Popover>
                                    <PopoverTrigger>
                                      <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </PopoverTrigger>
                                    <PopoverContent side="top">
                                      <Code>{currentData?.hostname}</Code> will
                                      be added to the <Code>/etc/hosts</Code>{" "}
                                      file. This is required for the browser to
                                      resolve the hostname to localhost. A modal
                                      will be shown to ask for your password.
                                      <br />
                                      <span className="text-red-400">
                                        Note: Your{" "}
                                        <Code style="sudo">/etc/hosts</Code>{" "}
                                        file will be backed up before editing.
                                      </span>
                                    </PopoverContent>
                                  </Popover>
                                </p>
                                <div className="">
                                  <MultiStateButton
                                    notReady={{
                                      current: !keychainAddComplete,
                                      string: "Add",
                                    }}
                                    ready={{
                                      current: keychainAddComplete,
                                      string: "Add",
                                      onClick: function (): void {
                                        setPasswordModalOpen(true);
                                      },
                                    }}
                                    done={{
                                      current: addToEtcHostsDone,
                                      string: "Done!",
                                      onClick: function (): void {
                                        // do nothing
                                      },
                                    }}
                                  />
                                </div>
                              </div>
                              {/* <div className="flex justify-between items-center py-8">
                                <p className="flex gap-2 items-center">
                                  4. Generate Nginx configuration file
                                  <Popover>
                                    <PopoverTrigger>
                                      <QuestionMarkCircleIcon className="w-4 h-4" />
                                    </PopoverTrigger>
                                    <PopoverContent side="top">
                                      Nginx configuration files will be
                                      generated for the hostname. This is
                                      required for the proxy server to work over
                                      docker.
                                    </PopoverContent>
                                  </Popover>
                                </p>
                                <MultiStateButton
                                  notReady={{
                                    current: !addToEtcHostsDone,
                                    string: "Generate",
                                  }}
                                  ready={{
                                    current: addToEtcHostsDone,
                                    string: "Generate",
                                    onClick: function (): void {
                                      onGenerateNginxConf();
                                    },
                                  }}
                                  done={{
                                    current: generateNginxConfDone,
                                    string: "Done!",
                                    onClick: function (): void {
                                      // do nothing
                                    },
                                  }}
                                />
                              </div> */}
                              <div className="flex justify-between items-center py-8">
                                <p>4. Close Wizard</p>
                                <MultiStateButton
                                  notReady={{
                                    current: !addToEtcHostsDone,
                                    string: "Waiting",
                                  }}
                                  ready={{
                                    current: addToEtcHostsDone,
                                    string: "Close",
                                    onClick: function (): void {
                                      if (currentData && selectedGroup) {
                                        addProxyItem(
                                          currentData,
                                          selectedGroup
                                        );
                                      }
                                      resetAndClose();
                                    },
                                  }}
                                  done={{
                                    current: false,
                                    string: "Done!",
                                    onClick: function (): void {
                                      resetAndClose();
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}

function CreateFormComponent({
  onNextButton,
}: {
  onNextButton: (data: IProxyData) => void;
}) {
  const { proxyList, totalProxyList } = proxyListStore();
  const [hostnameExists, setHostnameExists] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const [hostnameState, setHostnameState] = useState<string>("");
  const [portState, setPortState] = useState<string>("");

  const checkHostnameExists = useCallback(
    (hostname: string) => {
      setHostnameExists(
        totalProxyList.some((endpoint) => endpoint.hostname === hostname)
      );
    },
    [totalProxyList]
  );

  const fixHostname = (hostname: string) => {
    return hostname.replace(/[^a-z0-9\-\.]/g, "");
  };

  const onSubmitForm = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const nicknameGenerated = `Proxy for ${formData.get("hostname")}`;
    const data: IProxyData = {
      nickname: nicknameGenerated,
      hostname: formData.get("hostname") as string,
      port: parseInt(formData.get("port") as string),
      createdAt: new Date().toISOString(),
    };
    onNextButton(data);
  }, [onNextButton]);

  return (
    <form
      className="flex flex-col gap-8 w-full h-full justify-center"
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmitForm();
      }}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="font-bold mt-8">I have:</p>
        <div className={"flex items-center gap-1" + " " + roboto.className}>
          <h1 className="text-5xl">http://localhost:</h1>
          <input
            type="number"
            name="port"
            min={1}
            max={65535}
            required={true}
            className="p-2 bg-transparent border border-gray-600 caret-gray-600 rounded-md text-gray-100 text-5xl"
            placeholder="3000"
            value={portState}
            onChange={(e) => {
              setPortState(e.target.value);
            }}
          />
        </div>

        <p className="font-bold mt-8">I want:</p>
        <div className={"flex items-center gap-1" + " " + roboto.className}>
          <h1 className="text-5xl">https://</h1>
          <input
            type="text"
            name="hostname"
            required={true}
            maxLength={64}
            className={cn(
              hostnameExists
                ? "border-red-500 text-red-400"
                : "border-gray-600 text-gray-100",
              "p-2 bg-transparent border caret-gray-600 rounded-md text-5xl"
            )}
            placeholder="my.example.local"
            size={24}
            value={hostnameState}
            onChange={(e) => {
              const hostname = fixHostname(e.target.value);
              checkHostnameExists(hostname);
              setHostnameState(hostname);
            }}
          />
        </div>
      </div>

      {hostnameExists && (
        <div className="w-full text-center">
          <div className="text-red-500 text-sm">
            Hostname already exists. Please choose another.
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-center flex-col gap-4 mx-auto">
        <Button
          type="submit"
          className="w-full max-w-sm"
          size="lg"
          disabled={hostnameExists}
        >
          <div className="flex gap-2 items-center">
            Next <ArrowRightIcon className="h-4 w-4" />
          </div>
        </Button>
      </div>
    </form>
  );
}
