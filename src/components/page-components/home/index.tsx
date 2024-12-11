"use client";

// When using the Tauri API npm package:
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect } from "react";
// Write a text file to the `$APPCONFIG/app.conf` path

const onStartServer = () => {
  // Invoke the command
};
const loadTest = async () => {
  const res = await fetch("http://localhost:8899/api/test");
  const data = await res.json();
  console.log(data);
  return data;
};

export function HomeComponent() {
  useEffect(() => {
    loadTest();
  }, []);

  const onStartServer = useCallback(async () => {
    const res = await writeTextFile("app.conf", "file contents", {
      dir: BaseDirectory.AppData,
    });
    console.log(res);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 text-gray-100 bg-zinc-900">
      <div className="py-4">
        <h1 className="text-2xl tracking-tight font-semibold text-gray-300">
          Ophiuchi
        </h1>
        <p className="text-gray-400 text-sm">
          Start your local HTTPS proxy server with docker.
        </p>
      </div>
      <div className="rounded-xl bg-blue-950 p-12">
        <div className="flex flex-col gap-8 w-full max-w-sm">
          <div className="flex flex-col gap-1">
            <label className="text-sm">HOSTNAME</label>
            <input
              type="text"
              className="p-2 bg-transparent border-b border-b-blue-600 caret-blue-600"
              placeholder="hostname (ex:local.domain.com)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm">PORT</label>
            <input
              type="text"
              className="p-2 bg-transparent border-b border-b-blue-600 caret-blue-600"
              placeholder="proxy port number (ex:3000)"
            />
          </div>
          <div className="">
            <button
              className="px-4 py-2 text-white bg-blue-700 rounded-lg"
              onClick={() => {
                onStartServer();
              }}
            >
              Start Docker Server
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
