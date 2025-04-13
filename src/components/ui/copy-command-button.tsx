import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyCommandButtonProps {
  command: string;
  className?: string;
}

export function CopyCommandButton({
  command,
  className,
}: CopyCommandButtonProps) {

  return (
    <Button
      size="xs"
      variant="secondary"
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(command);
        toast.success("Command Copied");
      }}
    >
      <Copy className="h-3 w-3" />
      <span className="text-xs">Copy</span>
    </Button>
  );
}
