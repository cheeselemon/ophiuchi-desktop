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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IProxyData } from "@/helpers/proxy-manager/interfaces";
import proxyListStore from "@/stores/proxy-list";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";
import { withMask } from "use-mask-input";
import { z } from "zod";

const formSchema = z.object({
  port: z.preprocess(
    (arg) => parseInt(z.string().parse(arg), 10),
    z
      .number({
        required_error: "Port is required",
        invalid_type_error: "Port must be a number",
      })
      .int()
      .min(1)
      .max(65535)
  ),
  hostname: z.string().min(3).max(64),
});

export function AddProxyDialog({ onDone }: { onDone: () => void }) {
  const { addProxyItem, totalProxyList } = proxyListStore();
  const [open, setOpen] = React.useState(false);
  const [hostnameExists, setHostnameExists] = React.useState(false);
  const [canSubmit, setCanSubmit] = React.useState(false);
  const [hostErrorMessage, setHostErrorMessage] = React.useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      port: 0,
      hostname: "",
    },
  });

  const fixHostname = useCallback((hostname: string) => {
    return hostname.replace(/[^a-z0-9\-\.]/g, "");
  }, []);

  const checkHostnameExists = useCallback(
    (hostname: string) => {
      setHostnameExists(
        totalProxyList.some((endpoint) => endpoint.hostname === hostname)
      );
    },
    [totalProxyList]
  );

  const updateCanSubmit = useCallback(() => {
    const values = form.getValues();
    setCanSubmit(false);
    const hostname = fixHostname(values.hostname);
    checkHostnameExists(hostname);
    if (hostnameExists) {
      setHostErrorMessage("Hostname already exists");
      return;
    }
    if (hostname.length < 4) {
      setHostErrorMessage("Hostname must be at least 4 characters long");
      return;
    }
    if (hostname.endsWith(".app")) {
      setHostErrorMessage("Hostname cannot end with .app");
      return;
    }
    if (hostname.endsWith(".")) {
      setHostErrorMessage("Hostname cannot end with a dot");
      return;
    }
    // if hostname ends with dot + number, return
    if (/\.\d+$/.test(hostname)) {
      setHostErrorMessage("Hostname cannot end with a number");
      return;
    }
    if (values.port <= 0 || values.port > 65535) {
      setHostErrorMessage("Port must be between 1 and 65535");
      return;
    }
    setHostErrorMessage("");
    setCanSubmit(true);
  }, [form, fixHostname, checkHostnameExists, hostnameExists]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const hostname = fixHostname(values.hostname);
    checkHostnameExists(hostname);
    if (hostnameExists) return;
    if (values.port <= 0 || values.port > 65535) return;
    const data: IProxyData = {
      nickname: `Proxy for ${hostname}`,
      hostname: hostname,
      port: values.port,
      createdAt: new Date().toISOString(),
    };
    addProxyItem(data);
    onDone();
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        form.reset();
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="">
          <PlusIcon className="h-4 w-4" />
          Create Proxy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Proxy</DialogTitle>
          <DialogDescription>
            Create a new proxy to turn your local web app to support custom
            hostname and https.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 items-center">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application port</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        ref={withMask("99999", {
                          placeholder: "",
                          showMaskOnHover: false,
                        })}
                        required={true}
                        onChange={(e) => {
                          if (e.target.value.startsWith("0")) {
                            e.target.value = e.target.value.slice(1);
                          }
                          field.onChange(e);
                          updateCanSubmit();
                        }}
                        // value={portState}
                        // onChange={(e) => {
                        //   const port = e.target.value;
                        //   setPortState(port);
                        // }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your local application&apos;s port number.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hostname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostname</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          const sanitizedHostname = e.target.value.replace(
                            /[^a-z0-9\-\.]/g,
                            ""
                          );
                          field.onChange(sanitizedHostname);
                          updateCanSubmit();
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Any hostname you want to use locally. <br />
                      - Needs to be at least 4 characters long.
                      <br />- Cannot end with .app (MacOS)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          {hostErrorMessage ? (
            <div className="text-red-500/50 text-xs">{hostErrorMessage}</div>
          ) : (
            <div className="text-xs opacity-0">
              .
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={!canSubmit}
            onClick={() => {
              form.handleSubmit(onSubmit)();
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
