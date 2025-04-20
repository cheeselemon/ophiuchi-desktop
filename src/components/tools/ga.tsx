"use client";

import { invoke } from "@tauri-apps/api/core";
import { usePathname, useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import version from "../../../package.json";

declare global {
  interface Window {
    gtag: any;
  }
}

const GoogleAnalytics = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [userInstallDate, setUserInstallDate] = useState<string | null>(null);
  const [gtagLoaded, setGtagLoaded] = useState(false);
  const [ga_id, setGaId] = useState<string | null>(null);

  // const ga_id = useMemo(async () => {
  //   return await invoke("get_env", { name: "GTAG_ID" });
  // }, []);

  useEffect(() => {
    const fetchGaId = async () => {
      const id = await invoke("get_env", { name: "GTAG_ID" });
      setGaId(id as string);
      console.log(`id`, id);
    };
    fetchGaId();
  }, []);

  useEffect(() => {
    const installDate = window.localStorage.getItem("userInstallDate");
    if (installDate) {
      setUserInstallDate(installDate);
    } else {
      window.localStorage.setItem("userInstallDate", new Date().toISOString());
      setUserInstallDate(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (!userInstallDate) return;
    if (!gtagLoaded) return;
    window.gtag("set", "user_install_date", userInstallDate);
    window.gtag("set", "version", version);
    console.log(`userInstallDate`, userInstallDate);
    console.log(`version`, version.version);
  }, [userInstallDate, gtagLoaded]);

  // when pathname changes, send a pageview to Google Analytics
  useEffect(() => {
    // when pathname changes, send a pageview to Google Analytics
    if (typeof window === "undefined") return;
    if (!ga_id) return;
    if (!window.gtag) return;
    if (!pathname) return;
    console.log(`pathname`, pathname);
    window.gtag("config", ga_id, {
      page_path: pathname,
    });
  }, [ga_id, pathname]);

  if (!ga_id) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js? 
      id=${ga_id}`}
      ></Script>
      <Script
        id="google-analytics"
        onReady={() => {
          console.log(`gtagLoaded`, gtagLoaded);
          setGtagLoaded(true);
        }}
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${ga_id}');
        `,
        }}
      ></Script>
    </>
  );
};

export default GoogleAnalytics;
