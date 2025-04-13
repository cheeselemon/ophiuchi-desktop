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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import proxyListStore from "@/stores/proxy-list";
import { DialogClose } from "@radix-ui/react-dialog";
import { Label } from "@radix-ui/react-label";
import { BookmarkPlusIcon } from "lucide-react";
import React from "react";

export function AddProxyToGroupDialog({ onDone }: { onDone: () => void }) {
  const {
    addGroup,
    totalProxyList,
    proxyList,
    addProxyToGroup,
    selectedGroup,
  } = proxyListStore();
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full">
          <BookmarkPlusIcon className="h-4 w-4 mr-2" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Proxy to Group</DialogTitle>
          <DialogDescription>Select a proxy to add to group.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="name" className="sr-only">
              Group Name
            </Label>
            <Table>
              <TableCaption>Select a proxy to add to group.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Hostname</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalProxyList.map((proxyItem) => {
                  const isAlreadyAdded = proxyList.find(
                    (item) => item.hostname === proxyItem.hostname
                  );
                  return (
                    <TableRow key={proxyItem.hostname}>
                      <TableCell className="font-medium">
                        {proxyItem.hostname}
                      </TableCell>
                      <TableCell>{proxyItem.port}</TableCell>
                      <TableCell className="text-right">
                        {isAlreadyAdded ? (
                          <Button size={"sm"} variant="outline" disabled>
                            Added
                          </Button>
                        ) : (
                          <Button
                            size={"sm"}
                            onClick={() => {
                              if (!selectedGroup) return;
                              addProxyToGroup(proxyItem, selectedGroup);
                            }}
                          >
                            Add
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
