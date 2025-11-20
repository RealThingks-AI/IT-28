import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Activity, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const data = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Apr", value: 4500 },
  { name: "May", value: 6000 },
  { name: "Jun", value: 5500 },
  { name: "Jul", value: 7000 },
];

const recentActivity = [
  { id: 1, action: "New user registered", time: "2 minutes ago", type: "success" },
  { id: 2, action: "Project updated", time: "15 minutes ago", type: "info" },
  { id: 3, action: "Payment received", time: "1 hour ago", type: "success" },
  { id: 4, action: "Server deployed", time: "3 hours ago", type: "info" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$45,231.89"
          change="+20.1%"
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Active Users"
          value="2,350"
          change="+15.3%"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Conversion Rate"
          value="12.5%"
          change="-2.4%"
          icon={Activity}
          trend="down"
        />
        <StatCard
          title="Growth"
          value="35.2%"
          change="+8.1%"
          icon={TrendingUp}
          trend="up"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 mt-2 rounded-full ${
                      activity.type === "success" ? "bg-success" : "bg-info"
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
