/* eslint-disable @next/next/no-img-element */
"use client";

import { SystemHelper } from "@/helpers/system";
// When using the Tauri API npm package:
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { invoke } from "@tauri-apps/api/core";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import pkg from "../../../../package.json";

const loadTest = async () => {
  const res = await fetch("http://localhost:8899/api/test");
  const data = await res.json();
  console.log(data);
  return data;
};

function randomScentence() {
  const s = [
    "Catching moonbeams...",
    "Harvesting sun rays...",
    "Plucking comet tails...",
    "Collecting cloud whispers...",
    "Snaring cosmic winds...",
    "Scooping up aurora lights...",
    "Trapping nebula echoes...",
    "Seizing twilight shadows...",
    "Drawing in galaxy swirls...",
    "Binding meteor flashes...",
  ];
  return s[Math.floor(Math.random() * s.length)];
}

export function SetupComponent() {
  const [currentJob, setCurrentJob] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [dockerInstalled, setDockerInstalled] = useState(false);

  async function checkDocker() {
    try {
      const isInstalled = (await invoke("check_docker_installed")) as boolean;
      setDockerInstalled(isInstalled);
      return isInstalled;
    } catch (error) {
      console.error("Error checking Docker installation:", error);
    }
  }

  const onStartApp = useCallback(async () => {
    const s = randomScentence();
    setCurrentJob(s);
    const systemHelper = new SystemHelper();
    await systemHelper.boot();
    if (await checkDocker()) {
      setCurrentJob("Loading complete! Click Start.");
    } else {
      setCurrentJob(
        "Docker not installed! Please install Docker and restart app."
      );
      return;
    }
    setShowNext(true);
  }, []);

  useEffect(() => {
    if (showNext === false) {
      onStartApp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNext]);

  const canProceed = showNext && dockerInstalled;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 text-gray-100 bg-black">
      <img src="/bg1.jpg" className="fixed inset-0 -z-0 opacity-50" alt="" />
      <div className="mx-auto max-w-sm w-full z-10">
        <div className="py-4 w-full text-center">
          <h1 className="text-5xl font-bold tracking-tighter text-gray-100">
            Ophiuchi
            <span className="text-xs text-gray-400 ml-3 font-light tracking-tight">
              {pkg.version}
            </span>
          </h1>
          <p className="text-gray-300 text-sm font-light mt-3">
            Localhost SSL Proxy Server Manager
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900 px-12 py-8 mt-8 w-full text-gray-300 text-sm min-h-[140px] flex items-center justify-center">
          {currentJob}
        </div>
        <div className="mx-auto w-full flex">
          <Link
            href={canProceed ? "/endpoint-list" : "#"}
            className={cn(
              "w-full mt-4",
              canProceed ? "cursor-pointer" : "cursor-not-allowed"
            )}
          >
            <Button
              variant={"start"}
              disabled={!canProceed}
              className="w-full gap-2 duration-500"
            >
              Start <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="text-xs bg-zinc-400 p-2 rounded-md mt-4">
          <p className="font-medium text-gray-900">Alpha Notice & Disclaimer</p>
          <p className="text-gray-800 mt-1">
            Please note that the app is in the alpha phase, thus features may be
            added or removed without notice as we gather feedback and make
            improvements to the app. <br />
            This app may backup & edit one or more system files, use this at
            your own risk!
            <br />
            For detailed assistance, visit our{" "}
            <a
              href="https://discord.gg/fpp8kNyPtz"
              target="_blank"
              className="underline"
            >
              Discord
            </a>
            .
          </p>
        </div>
        {/* <Test_PasswordComponent /> */}
      </div>
    </div>
  );
}
