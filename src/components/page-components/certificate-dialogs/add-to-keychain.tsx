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
import { KeyRound } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect } from "react";

export default function AddCertificateToKeychainDialog({
  item,
  onDone,
}: {
  item: IProxyData;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [certExist, setCertExist] = React.useState(false);
  const [certAddedToKeychain, setCertAddedToKeychain] = React.useState(false);
  const [certExistsOnKeychain, setCertExistsOnKeychain] = React.useState(false);

  async function checkExist(hostname: string) {
    const certMgr = CertificateManager.shared();
    const exists = await certMgr.checkCertificateExists(hostname);
    setCertExist(exists);
    checkExistOnKeychain(hostname);
  }

  async function checkExistOnKeychain(hostname: string) {
    const exist = (await invoke("cert_exist_on_keychain", {
      name: `${item.hostname}`,
    })) as boolean;
    setCertExistsOnKeychain(exist);
  }

  const addCertToKeychain = useCallback(async () => {
    if (!item) return;
    try {
      const appDataDirPath = await appDataDir();
      const pemFilePath = `${appDataDirPath}/cert/${item.hostname}/cert.pem`;
      // support for whitespaces in path
      // const whiteSpaced = pemFilePath.replace(/ /g, "\\ ");
      const certExistsOnKeychain = await invoke("cert_exist_on_keychain", {
        name: `${item.hostname}`,
      });
      if (certExistsOnKeychain) {
        await invoke("remove_cert_from_keychain", {
          name: `${item.hostname}`,
        });
      }

      await invoke("add_cert_to_keychain", {
        pem_file_path: `${pemFilePath}`,
      });

      const _exists = (await invoke("cert_exist_on_keychain", {
        name: `${item.hostname}`,
      })) as boolean;
      setCertAddedToKeychain(true);
      setCertExistsOnKeychain(_exists);
    } catch (e) {
      console.error(e);
    }
  }, [item]);

  useEffect(() => {
    checkExist(item.hostname);
    checkExistOnKeychain(item.hostname);
    setCertAddedToKeychain(false);
  }, [item.hostname, open]);

  function certificateActionButton() {
    if (!certExist) {
      return (
        <span className="text-muted-foreground text-sm">
          Generate certificate first
        </span>
      );
    }
    if (certExist) {
      if (certAddedToKeychain) {
        return (
          <Button size="sm" variant="secondary" disabled={true}>
            Done
          </Button>
        );
      }
      return (
        <div className="grid gap-2">
          <Button size="sm" onClick={addCertToKeychain}>
            {certExistsOnKeychain && "Re-"}Add to Keychain
          </Button>
          <p className="text-sm text-muted-foreground">or</p>
          <p className="text-sm text-muted-foreground">
            <Link
              className="underline text-foreground"
              href="https://google.com"
            >
              See instructions
            </Link>{" "}
            on how to add and trust the certificate to your keychain manually.
          </p>
        </div>
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
        onDone();
      }}
    >
      <DialogTrigger asChild>
        {!certExistsOnKeychain ? (
          <Button variant="default" size="sm" className="">
            <KeyRound className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="">
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Certificate to Keychain Access</DialogTitle>
          <DialogDescription>
            This dialog will help you add the certificate to your keychain
            access and then trust it, so that your browser can trust the
            certificate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid space-y-8">
          <div className="grid gap-4">
            <Label>
              Click the button to add the certificate to your keychain access
              and trust.
            </Label>
            {certExistsOnKeychain && (
              <Label className="text-yellow-500">
                Certificate already added to keychain access. This will remove
                and re-add the certificate.
              </Label>
            )}
            <div className="mt-4">{certificateActionButton()}</div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            variant={"secondary"}
            onClick={() => {
              setOpen(false);
              onDone();
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
