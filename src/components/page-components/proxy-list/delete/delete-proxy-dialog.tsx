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
import type { Certificate } from "@/stores/cert-keychain-store";
import { certKeychainStore } from "@/stores/cert-keychain-store";
import systemStatusStore from "@/stores/system-status";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldAlert,
  TrashIcon,
  TriangleAlertIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DeleteProxyDialogProps {
  proxy: IProxyData;
  onDelete: () => void;
}

interface HostsFileContext {
  lineNumber: number;
  surroundingLines: string[];
}

interface StepStatus {
  completed: boolean;
  loading: boolean;
  error?: string;
}

const STEP_DELAY = 250;

export function DeleteProxyDialog({ proxy, onDelete }: DeleteProxyDialogProps) {
  const { isDockerContainerRunning } = systemStatusStore();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({
    1: { completed: false, loading: false },
    2: { completed: false, loading: false },
    3: { completed: false, loading: false },
  });

  const certManager = CertificateManager.shared();
  const [foundCertificates, setFoundCertificates] = useState<Certificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] =
    useState<Certificate | null>(null);
  const { findCertificates, removeCertBySha1 } = certKeychainStore.getState();

  // check every second if the dialog is open
  useEffect(() => {
    checkInitialStatus();
    const interval = setInterval(() => {
      if (open) {
        checkInitialStatus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const steps = [
    {
      step: 1,
      title: "Remove from /etc/hosts",
      description: "Delete hostname entry from hosts file",
      manualDescription:
        "Copy and paste the following command into your terminal.",
      requiresPassword: true,
      manualCommand: (proxy: IProxyData) =>
        `sudo sed -i '' '/^127\\.0\\.0\\.1[[:space:]]*'${proxy.hostname}'$/d' /etc/hosts`,
    },
    {
      step: 2,
      title: "Remove Certificate from Keychain",
      description: "Remove SSL certificate from Keychain",
      manualDescription:
        "Copy and paste the following command into your terminal.",
      requiresPassword: false,
      manualCommand: (proxy: IProxyData) => {
        // get the SHA-1
        const sha1 = foundCertificates.find(
          (cert) => cert.name === proxy.hostname
        )?.sha1;
        return `security delete-certificate -Z "${sha1}"`;
      },
    },
    {
      step: 3,
      title: "Delete Certificate Files",
      description: "Clean up certificate files",
      manualDescription:
        "Copy and paste the following command into your terminal.",
      requiresPassword: false,
      manualCommand: (proxy: IProxyData) => {
        // CertificateManager
        return certManager.getManualCommandToDeleteCertificate(proxy.hostname);
      },
    },
  ];

  const checkInitialStatus = async () => {
    try {
      // Check hosts file
      const hostsExists = await invoke("check_host_exists", {
        hostname: proxy.hostname,
      });
      setStepStatuses((prev) => ({
        ...prev,
        1: { ...prev[1], completed: !hostsExists },
      }));

      // Find certificates
      const certificates = (await findCertificates(proxy.hostname)).filter(
        (cert) => cert.name === proxy.hostname
      );
      setFoundCertificates(certificates);

      // Check if exact match exists
      const exactMatch = certificates.find(
        (cert) => cert.name === proxy.hostname
      );
      setSelectedCertificate(exactMatch || null);

      setStepStatuses((prev) => ({
        ...prev,
        2: { ...prev[2], completed: !exactMatch },
      }));

      // Check certificate files
      const certFilesExist = await certManager.checkCertificateExists(
        proxy.hostname
      );
      setStepStatuses((prev) => ({
        ...prev,
        3: { ...prev[3], completed: !certFilesExist },
      }));
    } catch (e) {
      console.error("Failed to check initial status:", e);
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
          await invoke("delete_line_from_hosts", {
            hostname: proxy.hostname,
            password,
          });

          const hostsExists = await invoke("check_host_exists", {
            hostname: proxy.hostname,
          });
          setStepStatuses((prev) => ({
            ...prev,
            1: {
              ...prev[1],
              completed: !hostsExists,
              error: hostsExists
                ? "Failed to delete from /etc/hosts"
                : undefined,
            },
          }));

          break;
        case 2:
          if (!selectedCertificate) {
            throw new Error("No certificate selected for deletion");
          }
          await removeCertBySha1(selectedCertificate.sha1);
          break;
        case 3:
          await certManager.deleteCertificateFiles(proxy.hostname);
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

  const everyStepCompleted = steps.every(
    (step) => stepStatuses[step.step].completed
  );

  const handleAutoDelete = async () => {
    if (everyStepCompleted) {
      setOpen(false);
      onDelete();
      return;
    }

    if (!password && steps[0].requiresPassword && !stepStatuses[1].completed) {
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
        // set next loading
        updateStepStatus(step + 1, { loading: true });
        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY));
      }
    }

    toast.success("Cleanup Completed");
  };

  function handleDeleteManually(): void {
    if (!everyStepCompleted) {
      toast.error("Proxy Not Deleted");
      return;
    }
    setOpen(false);
    onDelete();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isDockerContainerRunning}>
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlertIcon className="h-5 w-5 text-destructive" />
            Delete {proxy.hostname}
          </DialogTitle>
          <DialogDescription>
            You can proceed to delete this proxy automatically or manually.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full">
          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Automatic</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="py-4">
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
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
                    variant="destructive"
                    onClick={handleAutoDelete}
                    disabled={
                      (stepStatuses[currentStep].loading ||
                        (steps[0].requiresPassword &&
                          !password &&
                          !stepStatuses[1].completed) ||
                        (currentStep === 2 && !selectedCertificate)) &&
                      !everyStepCompleted
                    }
                    className="min-w-[200px]"
                  >
                    {stepStatuses[currentStep].loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </div>
                    ) : everyStepCompleted ? (
                      "Delete Proxy"
                    ) : (
                      "Start Automatic Cleanup"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TriangleAlertIcon className="h-3 w-3 text-yellow-500" />
                  <p className="text-xs text-muted-foreground">
                    Follow these steps carefully. System password will be
                    required for some operations.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {steps.map(
                      ({
                        step,
                        title,
                        manualDescription,
                        requiresPassword,
                        manualCommand,
                      }) => (
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
                            <CardDescription>
                              {manualDescription}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="text-xs">
                            <div className="space-y-2">
                              <Code
                                type="block"
                                className="text-xs text-muted-foreground"
                              >
                                {manualCommand(proxy)}
                              </Code>
                              <div className="flex justify-end">
                                <CopyCommandButton
                                  command={manualCommand(proxy)}
                                />
                              </div>
                            </div>
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
                      variant="destructive"
                      onClick={handleDeleteManually}
                      disabled={!everyStepCompleted}
                      className="min-w-[200px]"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
