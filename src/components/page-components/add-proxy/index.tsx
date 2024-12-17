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
import React, { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
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
  const { addProxyItem, selectedGroup, totalProxyList } = proxyListStore();
  const [groupName, setGroupName] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [portState, setPortState] = React.useState("");
  const [hostnameState, setHostnameState] = React.useState("");
  const [hostnameExists, setHostnameExists] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      port: 0,
      hostname: "",
    },
  });

  const fixHostname = (hostname: string) => {
    return hostname.replace(/[^a-z0-9\-\.]/g, "");
  };

  const checkHostnameExists = useCallback(
    (hostname: string) => {
      setHostnameExists(
        totalProxyList.some((endpoint) => endpoint.hostname === hostname)
      );
    },
    [totalProxyList]
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    debugger;
    const hostname = fixHostname(values.hostname);
    checkHostnameExists(hostname);
    if (hostnameExists) return;
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
            Create a new proxy to turn your local app into a custom hostname.
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
                    <FormLabel>Application port:</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        // value={portState}
                        // onChange={(e) => {
                        //   const port = e.target.value;
                        //   setPortState(port);
                        // }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your local application's port number.
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
                    <FormLabel>Hostname:</FormLabel>
                    <FormControl>
                      <Input placeholder={"my.app.local"}
                      {...field} />
                    </FormControl>
                    <FormDescription>
                      Any hostname you want to use.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={() => {
              form.handleSubmit(onSubmit)();
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
