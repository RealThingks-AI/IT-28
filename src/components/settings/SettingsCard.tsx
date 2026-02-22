import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}
export function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  headerAction
}: SettingsCardProps) {
  return <Card className={cn("border-border/50", className)}>
      













      <CardContent>{children}</CardContent>
    </Card>;
}