import { cn } from "@/lib/utils";

export default function Code({
  children,
  style = "normal",
}: {
  children: React.ReactNode;
  style?: "normal" | "sudo";
}) {
  function fontColor() {
    return style === "normal" ? " " : "text-red-500";
  }

  function bgColor() {
    return style === "normal" ? " " : "bg-red-950";
  }

  return (
    <code
      className={cn(fontColor(), bgColor(), "px-1.5 py-0.5 rounded-md text-sm")}
    >
      {children}
    </code>
  );
}
