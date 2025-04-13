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
import { Input } from "@/components/ui/input";
import proxyListStore from "@/stores/proxy-list";
import { Label } from "@radix-ui/react-label";

import React, { useEffect } from "react";

export function EditGroupDialog() {
  const { selectedGroup, updateGroup, deleteGroup } = proxyListStore();
  const [groupName, setGroupName] = React.useState("");
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    if (!selectedGroup) return;
    setGroupName(selectedGroup.name);
  }, [selectedGroup]);

  if (!selectedGroup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"outline"} size={"xs"} className="flex">
          Edit
        </Button>
        {/* <Button variant="outline" className="w-full">
          <PlusIcon className="h-4 w-4" />
          Create Group
        </Button> */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>Edit the name of the group.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="name" className="sr-only">
              Group Name
            </Label>
            <Input
              id="name"
              placeholder="ex) Workplace"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
              }}
            />
          </div>
        </div>
        <DialogFooter className="flex w-full">

          <Button
            type="submit"
            disabled={!groupName || groupName.length === 0}
            onClick={() => {
              if (!groupName || groupName.length === 0) return;
              selectedGroup.name = groupName;
              updateGroup(selectedGroup);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
