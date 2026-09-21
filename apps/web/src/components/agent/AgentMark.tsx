import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentMarkProps = {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
};

const sizes = {
  sm: { wrap: "size-7", icon: "size-3.5" },
  md: { wrap: "size-8", icon: "size-4" },
} as const;

export function AgentMark({ className, iconClassName, size = "md" }: AgentMarkProps) {
  const dims = sizes[size];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-agent text-white",
        dims.wrap,
        className,
      )}
      aria-hidden
    >
      <Bot className={cn(dims.icon, iconClassName)} />
    </span>
  );
}
