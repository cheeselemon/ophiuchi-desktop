import { cn } from "@/lib/utils";

export default function Code({
  children,
  style = "normal",
  type = "normal",
  className,
}: {
  children: React.ReactNode;
  style?: "normal" | "sudo";
  type?: "normal" | "block";
  className?: string;
}) {
  function fontColor() {
    return style === "normal" ? " " : "text-red-500";
  }

  function bgColor() {
    return style === "normal" ? " " : "bg-red-950";
  }

  function blockStyle() {
    return type === "block"
      ? "w-full border border-muted-foreground/20 rounded-md font-mono p-1.5 break-all"
      : "px-1.5 py-0.5 rounded-md whitespace-break-spaces border-muted-foreground/20 border";
  }

  if (type === "block") {
    return (
      <div className={cn(fontColor(), bgColor(), blockStyle(), className)}>
        {children}
      </div>
    );
  } else {
    return (
      <code className={cn(fontColor(), bgColor(), blockStyle(), className)}>
        {children}
      </code>
    );
  }
}
