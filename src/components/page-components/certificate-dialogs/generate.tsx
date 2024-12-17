import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";
import { PlusIcon } from "lucide-react";
import React, { useEffect } from "react";

export default function GenerateCertificateDialog({
  item,
  onDone,
}: {
  item: IProxyData;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [certExist, setCertExist] = React.useState(false);

  async function checkExist(hostname: string) {
    const certMgr = CertificateManager.shared();
    const exists = await certMgr.checkCertificateExists(hostname);
    setCertExist(exists);
  }

  function generateCertificate() {
    const certMgr = CertificateManager.shared();
    certMgr.generateCertificate(item.hostname).then((pems) => {
      console.log(pems);
      checkExist(item.hostname);
    });
  }

  useEffect(() => {
    checkExist(item.hostname);
  }, [item.hostname]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
        onDone();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="">
          <PlusIcon className="h-4 w-4" />
          Generate Certificate...
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Certificate</DialogTitle>
          <DialogDescription>
            Generate new certificate for this proxy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid space-y-8">
          <div className="grid gap-4">
            <Label>
              Generate a new certificate for <strong>{item.hostname}</strong>
            </Label>
            <div className="flex">
              {certExist ? (
                <div className="">
                  <Button size="sm" variant="secondary" disabled={true}>
                    Done
                  </Button>
                  <p
                    className="underline cursor-pointer text-muted-foreground text-sm pt-2"
                    onClick={async () => {
                      const appDataDirPath = await appDataDir();
                      invoke("open_finder_or_explorer", {
                        path: `${appDataDirPath}/cert/${item.hostname}`,
                      });
                    }}
                  >
                    Locate on Finder...
                  </p>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    generateCertificate();
                  }}
                >
                  Generate Certificate
                </Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              setOpen(false);
              onDone();
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
