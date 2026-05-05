import { cn } from "@/lib/utils";

export function NeonText({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
}) {
  return <Tag className={cn("neon-text", className)}>{children}</Tag>;
}
