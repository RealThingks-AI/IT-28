import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "down";
}

export function StatCard({ title, value, change, icon: Icon, trend }: StatCardProps) {
  const trendColor = trend === "up" ? "text-success" : "text-destructive";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className={`text-xs ${trendColor} mt-1`}>
          {trend === "up" ? "↑" : "↓"} {change} from last month
        </p>
      </CardContent>
    </Card>
  );
}
