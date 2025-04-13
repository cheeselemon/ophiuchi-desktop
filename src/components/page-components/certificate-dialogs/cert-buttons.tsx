"use client";

import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { ICON_SIZE, ICON_STROKE_WIDTH } from "@/lib/constants";
import { certKeychainStore } from "@/stores/cert-keychain-store";
import { appDataDir } from "@tauri-apps/api/path";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PrepareProxyDialog } from "../proxy-list/prepare/prepare-proxy-dialog";

export default function PrepareButtons({ item }: { item: IProxyData }) {
  const [certExist, setCertExist] = useState<boolean | undefined>(undefined);
  const { certOnKeychain } = certKeychainStore();

  const openCert = useCallback(async (data: IProxyData) => {
    const appDataDirPath = await appDataDir();
    const certPath = `${appDataDirPath}/cert/${data.hostname}`;
    shellOpen(certPath);
  }, []);

  async function checkExist(hostname: string) {
    const configHelper = CertificateManager.shared();
    const exists = await configHelper.checkCertificateExists(hostname);
    setCertExist(exists);
  }

  useEffect(() => {
    checkExist(item.hostname);
  }, [item.hostname]);

  if (certExist === undefined) {
    return (
      <div>
        <LoaderCircle
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE_WIDTH}
          className="animate-spin"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <PrepareProxyDialog
        proxy={item}
        onDone={() => {
          checkExist(item.hostname);
        }}
      />
    </div>
  );
}
