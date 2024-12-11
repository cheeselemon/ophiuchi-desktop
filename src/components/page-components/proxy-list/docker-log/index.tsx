import { Dialog, Transition } from "@headlessui/react";
import { Command } from "@tauri-apps/plugin-shell";
import { Fragment, useEffect, useState } from "react";

export default function DockerLogModal({
  stream,
  detailedStream,
  isOpen,
  onClosed,
}: {
  stream: any;
  detailedStream: any;
  isOpen: boolean;
  onClosed?: () => void;
}) {
  const [_isOpen, setIsOpen] = useState(true);
  const [showDetailedLog, setShowDetailedLog] = useState(false);

  useEffect(() => {
    setIsOpen(isOpen);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setShowDetailedLog(false);
    onClosed && onClosed();
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <Transition appear show={_isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Docker Command Log
                  </Dialog.Title>
                  <div className="mt-2">
                    <div className="h-[50%] max-h-[400px] overflow-y-auto bg-zinc-50 p-8 min-h-[400px]">
                      <code className="text-sm text-gray-500 whitespace-pre-wrap ">
                        {showDetailedLog ? detailedStream : stream}
                      </code>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <p
                      className="text-sm text-gray-800 cursor-pointer underline"
                      onClick={async () => {
                        setShowDetailedLog(true);
                      }}
                    >
                      See detailed logs...
                    </p>
                    <p
                      className="text-sm text-gray-800 cursor-pointer underline"
                      onClick={async () => {
                        const openDockerCmd = new Command("open-docker-app");
                        const openDockerOutput = await openDockerCmd.execute();
                        console.log(openDockerOutput);
                      }}
                    >
                      Open Docker Desktop
                    </p>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
