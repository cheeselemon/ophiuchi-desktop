import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useEffect, useState } from "react";

export default function DockerLogModal({
  stream,
  detailedStream,
  isOpen,
  onClosed,
  onClearLogs,
}: {
  stream: any;
  detailedStream: any;
  isOpen: boolean;
  onClosed?: () => void;
  onClearLogs?: () => void;
}) {
  const [_isOpen, setIsOpen] = useState(true);
  const [showDetailedLog, setShowDetailedLog] = useState(true);

  useEffect(() => {
    setIsOpen(isOpen);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    onClosed && onClosed();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-4xl"
          onCloseAutoFocus={(event) => {
            // fix for https://github.com/radix-ui/primitives/issues/1241
            event.preventDefault();
            document.body.style.pointerEvents = "";
          }}
        >
          <DialogHeader>
            <DialogTitle>Docker Command Log</DialogTitle>
            <DialogDescription>
              This dialog shows the logs of the docker command that was
              executed.
              <br />
              To see detailed logs of the docker command, check the detailed logs
              checkbox.
              <br />
              <span>You can close the dialog anytime.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="mt-2  w-full">
                <div className="h-[50%] max-h-[400px] overflow-y-auto  p-8 min-h-[400px] bg-foreground/10 rounded-lg">
                  <code className="text-sm  whitespace-pre-wrap">
                    {showDetailedLog ? detailedStream : stream}
                  </code>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 justify-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="detailed-logs"
                  checked={showDetailedLog}
                  onCheckedChange={(checked) =>
                    setShowDetailedLog(checked as boolean)
                  }
                />
                <label
                  htmlFor="detailed-logs"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  See detailed logs
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant={"outline"}
              onClick={async () => {
                onClearLogs && onClearLogs();
              }}
            >
              Clear Logs
            </Button>
            <Button variant={"secondary"} onClick={closeModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
