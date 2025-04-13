"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Code from "@/components/ui/code";
import { CopyCommandButton } from "@/components/ui/copy-command-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificateManager } from "@/helpers/certificate-manager";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import { cn } from "@/lib/utils";
import { certKeychainStore } from "@/stores/cert-keychain-store";
import { hostsStore } from "@/stores/hosts-store";
import proxyListStore from "@/stores/proxy-list";
import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PrepareProxyDialogProps {
  proxy: IProxyData;
  onDone: () => void;
}

interface StepStatus {
  completed: boolean;
  loading: boolean;
  error?: string;
}

const STEP_DELAY = 500;

export function PrepareProxyDialog({ proxy, onDone }: PrepareProxyDialogProps) {
  const [loading, setLoading] = useState(true);
  const [backupPath, setBackupPath] = useState("");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [everyStepCompleted, setEveryStepCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [certExists, setCertExists] = useState(false);
  const [certGenerating, setCertGenerating] = useState(false);
  const [manualCommands, setManualCommands] = useState<Record<number, string>>({
    1: "", // keychain command
    2: `sudo sh -c 'echo "127.0.0.1 ${proxy.hostname}" >> /etc/hosts'`, // hosts command
  });
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({
    1: { completed: false, loading: false },
    2: { completed: false, loading: false },
  });

  const certManager = CertificateManager.shared();
  const { generateManualCommand, addCertToKeychain } = certKeychainStore();
  const { addHostToFile, checkHostExists } = hostsStore();
  const { updateProxyCanLaunch, proxyList } = proxyListStore();

  const onOpenBackupFiles = useCallback(async () => {
    invoke("open_finder_or_explorer", {
      path: backupPath,
    });
  }, [backupPath]);

  useEffect(() => {
    homeDir().then((path) => {
      setBackupPath(`${path}/ophiuchi.hosts.bak`);
    });
  }, []);

  const certificateStep = {
    title: "Generate Certificate",
    description:
      "A self-signed certificate will be generated for the proxy, used for SSL/HTTPS connections.",
    requiresPassword: false,
  };

  const steps = useMemo(
    () => [
      {
        step: 1,
        title: "Add to Keychain",
        manualDescription:
          "Copy and paste the following to add the certificate to Keychain Access.",
        description: "Adds SSL certificate to Keychain Access",
        requiresPassword: false,
      },
      {
        step: 2,
        title: "Add to /etc/hosts",
        manualDescription:
          "Copy and paste the following to create an entry in /etc/hosts file",
        description: (
          <>
            Adds an entry to /etc/hosts file. Automatic backups are created{" "}
            <span
              onClick={onOpenBackupFiles}
              className="underline cursor-pointer"
            >
              here
            </span>
            .
          </>
        ),
        requiresPassword: true,
      },
    ],
    []
  );

  const checkInitialStatus = async () => {
    try {
      const certExist = await certManager.checkCertificateExists(
        proxy.hostname
      );
      setCertExists(certExist);

      if (!certExist) {
        setLoading(false);
        return;
      }

      // Run all other checks in parallel

      const [certInKeychain, hostExists, keychainCommand] = await Promise.all([
        certKeychainStore
          .getState()
          .checkCertExistOnKeychain(proxy.hostname, true)
          .then((result) => {
            return result;
          }),
        checkHostExists(proxy.hostname).then((result) => {
          return result;
        }),
        generateManualCommand(proxy.hostname).then((result) => {
          return result;
        }),
      ]);

      setStepStatuses((prev) => ({
        ...prev,
        1: { ...prev[1], completed: certInKeychain },
        2: { ...prev[2], completed: hostExists },
      }));

      setManualCommands((prev) => ({
        ...prev,
        1: keychainCommand,
      }));
    } catch (e) {
      console.error("Failed to check initial status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitialStatus();

    // interval
    if (open) {
      const interval = setInterval(() => {
        checkInitialStatus();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const handleGenerateCertificate = async () => {
    try {
      setCertGenerating(true);
      await certManager.generateCertificate(proxy.hostname);
      setCertExists(true);
      toast.success("Certificate Generated");
    } catch (e) {
      console.error("Failed to generate certificate:", e);
      toast.error("Certificate Generation Failed");
    } finally {
      setCertGenerating(false);
    }
  };

  const updateStepStatus = (step: number, status: Partial<StepStatus>) => {
    setStepStatuses((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...status },
    }));
  };

  const handleStepExecution = async (step: number) => {
    updateStepStatus(step, { loading: true });

    try {
      switch (step) {
        case 1:
          await addCertToKeychain(proxy.hostname);
          break;
        case 2:
          await addHostToFile(proxy.hostname, password);
          break;
      }

      updateStepStatus(step, { completed: true, loading: false });
      return true;
    } catch (e) {
      console.error(`Failed at step ${step}:`, e);
      const error = e instanceof Error ? e.message : "Unknown error";
      updateStepStatus(step, {
        loading: false,
        error: `Failed to complete step ${step}: ${error}`,
      });
      return false;
    }
  };

  useEffect(() => {
    const everyStepCompleted = steps.every(
      (step) => stepStatuses[step.step].completed
    );
    setEveryStepCompleted(everyStepCompleted);
  }, [stepStatuses, steps]);

  useEffect(() => {
    if (everyStepCompleted) {
      console.log(`everyStepCompleted`, everyStepCompleted);
      updateProxyCanLaunch(proxy, everyStepCompleted);
    }
  }, [everyStepCompleted]);

  const handleAutoSetup = async () => {
    if (everyStepCompleted) {
      setOpen(false);
      onDone();
      return;
    }

    if (!password && steps[1].requiresPassword && !stepStatuses[2].completed) {
      toast.error("Password Required");
      return;
    }

    for (const { step } of steps) {
      if (stepStatuses[step].completed) {
        continue; // Skip already completed steps
      }

      setCurrentStep(step);
      const success = await handleStepExecution(step);

      if (!success) {
        toast.error(
          `Failed at step ${step}. Please check the error message and try again.`
        );
        return;
      }

      if (step < steps.length) {
        updateStepStatus(step + 1, { loading: true });
        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY));
      }
    }

    toast.success("Setup Completed");
  };

  function handleSetupManually(): void {
    if (!everyStepCompleted) {
      toast.error("Setup Not Complete");
      return;
    }
    setOpen(false);
    onDone();
  }

  function displayIcon() {
    if (loading) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    }
    if (everyStepCompleted) {
      return <Wrench className="h-3.5 w-3.5 text-green-500" />;
    } else {
      return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {displayIcon()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Setup {proxy.hostname}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div className="w-full space-y-6">
          {/* Certificate Generation - Common Area */}
          <Card>
            <CardHeader>
              <CardTitle
                className={cn(
                  "text-sm font-semibold flex gap-2 items-center",
                  certExists && "text-muted-foreground"
                )}
              >
                {certificateStep.title}
                {certExists && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              <CardDescription>{certificateStep.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {!certExists && (
                <Button
                  size={"sm"}
                  onClick={handleGenerateCertificate}
                  variant={certExists ? "secondary" : "default"}
                  disabled={certExists || certGenerating}
                >
                  {certGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    "Click to Generate Certificate"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Setup Steps - Tabs */}
          {certExists && (
            <Tabs defaultValue="auto" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto">Automatic</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="py-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {steps.map(
                      ({ step, title, description, requiresPassword }) => (
                        <Card className="w-full" key={step}>
                          <CardHeader>
                            <CardTitle
                              className={cn(
                                "text-sm font-semibold flex gap-2 items-center",
                                stepStatuses[step].error && "text-destructive",
                                stepStatuses[step].completed &&
                                  "text-muted-foreground line-through"
                              )}
                            >
                              {title}
                              {stepStatuses[step].completed && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs">
                            <p
                              className={cn(
                                "text-muted-foreground",
                                stepStatuses[step].error && "text-destructive",
                                stepStatuses[step].completed && "line-through"
                              )}
                            >
                              {description}
                            </p>
                            {requiresPassword &&
                              !stepStatuses[step].completed && (
                                <div className="mt-4 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-yellow-500" />
                                    <p className="text-xs text-muted-foreground">
                                      System password is required for this step
                                    </p>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label
                                      htmlFor="password"
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <KeyRound className="h-3.5 w-3.5" />
                                      System Password
                                    </Label>
                                    <Input
                                      id="password"
                                      type="password"
                                      value={password}
                                      onChange={(e) =>
                                        setPassword(e.target.value)
                                      }
                                      placeholder="Enter your system password"
                                    />
                                  </div>
                                </div>
                              )}
                            {stepStatuses[step].error && (
                              <div className="mt-2 text-sm text-destructive">
                                {stepStatuses[step].error}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleAutoSetup}
                      disabled={
                        stepStatuses[currentStep].loading ||
                        (steps[1].requiresPassword &&
                          !password &&
                          !stepStatuses[2].completed) ||
                        (currentStep === 1 && !certExists)
                      }
                      className="min-w-[200px]"
                    >
                      {stepStatuses[currentStep].loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </div>
                      ) : everyStepCompleted ? (
                        "Done"
                      ) : (
                        "Start Automatic Setup"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="py-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">
                      Follow these steps carefully. System password will be
                      required for some operations.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {steps.map(({ step, title, manualDescription }) => (
                      <Card key={step}>
                        <CardHeader>
                          <CardTitle
                            className={cn(
                              "text-sm font-semibold flex gap-2 items-center",
                              stepStatuses[step].error && "text-destructive",
                              stepStatuses[step].completed &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {title}
                            {stepStatuses[step].completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </CardTitle>
                          <CardDescription>{manualDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs">
                          <div className="space-y-2">
                            <Code
                              type="block"
                              className="text-xs text-muted-foreground"
                            >
                              {manualCommands[step]}
                            </Code>
                            <div className="flex justify-end">
                              <CopyCommandButton
                                command={manualCommands[step]}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleSetupManually}
                      disabled={!everyStepCompleted}
                      className="min-w-[200px]"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
